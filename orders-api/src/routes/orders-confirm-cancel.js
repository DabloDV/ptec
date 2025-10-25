const express = require('express');
const { getPool } = require('../db');

function serviceAuth(req, res, next){
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if(!token || token !== (process.env.SERVICE_TOKEN || 'service-secret-123')){
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

const router = express.Router();

router.post('/:id/confirm', serviceAuth, async (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' });

  const idem = req.header('Idempotency-Key') || req.header('X-Idempotency-Key');
  if(!idem) return res.status(400).json({ error: 'missing_idempotency_key' });

  let conn;
  try {
    const pool = await getPool();
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [idemRows] = await conn.execute(
      'SELECT status, response_body FROM idempotency_keys WHERE `key`=? AND target_type=? AND target_id=? FOR UPDATE',
      [idem, 'ORDER_CONFIRM', id]
    );
    if(idemRows.length && idemRows[0].status === 'SUCCEEDED'){
      const raw = idemRows[0].response_body;
      let cached = null;
      if (raw != null) {
        if (Buffer.isBuffer(raw)) { try { cached = JSON.parse(raw.toString('utf8')); } catch(_) {} }
        else if (typeof raw === 'string') { try { cached = JSON.parse(raw); } catch(_) {} }
        else if (typeof raw === 'object') { cached = raw; }
      }
      await conn.commit();
      if (cached) return res.json(cached);
      const [outRows] = await conn.execute('SELECT id, status, total_cents FROM orders WHERE id=?', [id]);
      return res.json(outRows[0] || { id, status: 'CONFIRMED' });
    }

    const [ordRows] = await conn.execute('SELECT id, status, total_cents FROM orders WHERE id=? FOR UPDATE', [id]);
    if(!ordRows.length){ await conn.rollback(); return res.status(404).json({ error: 'not_found' }); }
    const ord = ordRows[0];

    if(ord.status === 'CONFIRMED'){
      if(!idemRows.length){
        await conn.execute(
          'INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body) VALUES (?,?,?,?,?)',
          [idem, 'ORDER_CONFIRM', id, 'SUCCEEDED', JSON.stringify(ord)]
        );
      }
      await conn.commit();
      return res.json(ord);
    }
    if(ord.status !== 'CREATED'){ await conn.rollback(); return res.status(409).json({ error: 'invalid_state' }); }

    await conn.execute('UPDATE orders SET status="CONFIRMED" WHERE id=?', [id]);
    const [outRows] = await conn.execute('SELECT id, status, total_cents FROM orders WHERE id=?', [id]);
    const body = outRows[0];

    if(idemRows.length){
      await conn.execute(
        'UPDATE idempotency_keys SET status="SUCCEEDED", response_body=? WHERE `key`=? AND target_type=? AND target_id=?',
        [JSON.stringify(body), idem, 'ORDER_CONFIRM', id]
      );
    } else {
      await conn.execute(
        'INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body) VALUES (?,?,?,?,?)',
        [idem, 'ORDER_CONFIRM', id, 'SUCCEEDED', JSON.stringify(body)]
      );
    }

    await conn.commit();
    return res.json(body);
  } catch (e){
    try { if (conn) await conn.rollback(); } catch {}
    return res.status(500).json({ error: 'confirm_failed' });
  } finally { if (conn) conn.release(); }
});

router.post('/:id/cancel', serviceAuth, async (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' });

  let conn;
  try {
    const pool = await getPool();
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [ordRows] = await conn.execute('SELECT id, status FROM orders WHERE id=? FOR UPDATE', [id]);
    if(!ordRows.length){ await conn.rollback(); return res.status(404).json({ error: 'not_found' }); }
    const ord = ordRows[0];

    if(ord.status === 'CREATED'){
      const [items] = await conn.execute('SELECT product_id, qty FROM order_items WHERE order_id=?', [id]);
      for(const it of items){
        await conn.execute('UPDATE products SET stock = stock + ? WHERE id=?', [it.qty, it.product_id]);
      }
      await conn.execute('UPDATE orders SET status="CANCELED" WHERE id=?', [id]);
      await conn.commit();
      return res.json({ id, status: 'CANCELED' });
    }

    await conn.rollback();
    return res.status(409).json({ error: 'cannot_cancel' });
  } catch (e){
    try { if (conn) await conn.rollback(); } catch {}
    return res.status(500).json({ error: 'cancel_failed' });
  } finally { if (conn) conn.release(); }
});

module.exports = router;
