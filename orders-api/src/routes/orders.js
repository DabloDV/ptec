const express = require("express");
const { getPool } = require("../db");
const { createOrderSchema } = require("../validation/orderSchema");
const { serviceAuth } = require("../middleware/serviceAuth");

const router = express.Router();

//#Crear orden
router.post("/orders", async (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const idempKey = req.header("Idempotency-Key") || null;
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    //#Si viene Idempotency-Key y ya existe devolver la respuesta cache
    if (idempKey) {
      const [ik] = await conn.query("SELECT status, response_body FROM idempotency_keys WHERE `key`=? FOR UPDATE", [idempKey]);
      if (ik.length && ik[0].status === "COMPLETED" && ik[0].response_body) {
        await conn.commit();
        return res.status(201).json(JSON.parse(ik[0].response_body));
      }
    }

    const { customerId, items } = value;

    //#Verificar cliente
    const [cRows] = await conn.query("SELECT id FROM customers WHERE id=? AND deleted_at IS NULL", [customerId]);
    if (!cRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Customer not found" });
    }

    //#Obten productos con FOR UPDATE
    const ids = items.map(it => it.productId);
    const placeholders = ids.map(()=>"?").join(",");
    const [pRows] = await conn.query(
      `SELECT id, price_cents, stock FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      ids
    );
    if (pRows.length !== ids.length) {
      await conn.rollback();
      return res.status(400).json({ error: "One or more products not found" });
    }

    //#Mapa id -> producto
    const pMap = new Map(pRows.map(p => [p.id, p]));

    //#Validar stock y calcular total
    let total = 0;
    for (const it of items) {
      const p = pMap.get(it.productId);
      if (!p || p.stock < it.qty) {
        await conn.rollback();
        return res.status(409).json({ error: `Insufficient stock for product ${it.productId}` });
      }
      total += p.price_cents * it.qty;
    }

    //#Descontar inventario
    for (const it of items) {
      await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [it.qty, it.productId]);
    }

    //#Crear orden
    const [ordRes] = await conn.query(
      "INSERT INTO orders (customer_id, status, total_cents) VALUES (?, 'CREATED', ?)",
      [customerId, total]
    );

    const orderId = ordRes.insertId;

    //#Items
    const values = [];
    for (const it of items) {
      const p = pMap.get(it.productId);
      const unit = p.price_cents;
      const sub  = unit * it.qty;
      values.push([orderId, it.productId, it.qty, unit, sub]);
    }
    await conn.query(
      "INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES ?",
      [values]
    );

    //#Respuesta
    const payload = {
      id: orderId,
      customerId,
      status: "CREATED",
      total_cents: total,
      items: values.map(v => ({ productId: v[1], qty: v[2], unit_price_cents: v[3], subtotal_cents: v[4] }))
    };

    //#Guarda idempotencia if tr
    if (idempKey) {
      await conn.query(
        "REPLACE INTO idempotency_keys (`key`, target_type, target_id, status, response_body) VALUES (?,?,?,?,?)",
        [idempKey, "order", orderId, "COMPLETED", JSON.stringify(payload)]
      );
    }

    await conn.commit();
    return res.status(201).json(payload);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ error: "Internal error" });
  } finally {
    conn.release();
  }
});

//#Detalle de orden
router.get("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const pool = await getPool();
  const [o] = await pool.query(
    "SELECT id, customer_id AS customerId, status, total_cents, created_at FROM orders WHERE id=?",
    [id]
  );
  if (!o.length) return res.status(404).json({ error: "Not found" });

  const [items] = await pool.query(
    "SELECT product_id AS productId, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id=?",
    [id]
  );
  const out = { ...o[0], items };
  return res.json(out);
});

//#Listado básico
router.get("/orders", async (req, res) => {
  const status = String(req.query.status || "").trim();
  const customerId = Number(req.query.customerId || 0);
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const cursor = Number(req.query.cursor || 0);

  const pool = await getPool();
  const where = [];
  const params = [];

  if (status) { where.push("status=?"); params.push(status); }
  if (customerId) { where.push("customer_id=?"); params.push(customerId); }
  if (cursor) { where.push("id > ?"); params.push(cursor); }

  const sql =
    `SELECT id, customer_id AS customerId, status, total_cents, created_at
     FROM orders
     ${where.length ? "WHERE "+where.join(" AND ") : ""}
     ORDER BY id ASC
     LIMIT ?`;
  const [rows] = await pool.query(sql, [...params, limit + 1]);

  let nextCursor = null;
  let data = rows;
  if (rows.length > limit) {
    nextCursor = rows[limit - 1].id;
    data = rows.slice(0, limit);
  }
  return res.json({ data, nextCursor });
});

//#Endpoint int
router.get("/internal/orders/:id", serviceAuth, async (req,res)=>{
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const pool = await getPool();
  const [o] = await pool.query(
    "SELECT id, customer_id AS customerId, status, total_cents, created_at FROM orders WHERE id=?",
    [id]
  );
  if (!o.length) return res.status(404).json({ error: "Not found" });
  return res.json(o[0]);
});

module.exports = router;