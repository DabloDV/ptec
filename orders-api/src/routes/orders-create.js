const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { customer_id, items } = req.body || {};
  if (!Number.isFinite(Number(customer_id)) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'bad_request' }); 
  }

  let conn; 
  try {
    const pool = await getPool();      
    conn = await pool.getConnection(); 
    await conn.beginTransaction();

    const [ins] = await conn.execute(
      'INSERT INTO orders (customer_id, status, total_cents) VALUES (?,?,?)',
      [customer_id, 'CREATED', 0]
    );
    const orderId = ins.insertId;

    let total = 0;
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.qty);
      if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) {
        throw Object.assign(new Error('invalid_item'), { status: 400 });
      }

      const [pr] = await conn.execute(
        'SELECT id, price_cents, stock FROM products WHERE id=? FOR UPDATE', [pid]
      );
      if (!pr.length) throw Object.assign(new Error('product_not_found'), { status: 404 });
      if (pr[0].stock < qty) throw Object.assign(new Error('insufficient_stock'), { status: 409 });

      const subtotal = pr[0].price_cents * qty;
      total += subtotal;

      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?,?,?,?,?)',
        [orderId, pid, qty, pr[0].price_cents, subtotal]
      );
      await conn.execute('UPDATE products SET stock = stock - ? WHERE id=?', [qty, pid]);
    }

    await conn.execute('UPDATE orders SET total_cents=? WHERE id=?', [total, orderId]);
    await conn.commit();

    const [out] = await conn.execute(
      'SELECT id, customer_id, status, total_cents, created_at FROM orders WHERE id=?',
      [orderId]
    );
    return res.status(201).json(out[0]);
  } catch (e) {
    try { if (conn) await conn.rollback(); } catch {}
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'create_failed' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
