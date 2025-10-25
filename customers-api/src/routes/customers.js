const express = require("express");
const { getPool } = require("../db");
const { createCustomerSchema, updateCustomerSchema } = require("../validation/customerSchema");
const { serviceAuth } = require("../middleware/serviceAuth");

const router = express.Router();



// Crear cliente
router.post("/customers", async (req, res) => {
  //#Validar input
  const { error, value } = createCustomerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { name, email, phone } = value;
  const pool = await getPool();

  try {
    const [result] = await pool.execute(
      "INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)",
      [name, email, phone || null]
    );
    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, created_at FROM customers WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    //#Maneja email duplicado (índice UNIQUE).
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
});

// Detalle de cliente
router.get("/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const pool = await getPool();
  const [rows] = await pool.execute(
    "SELECT id, name, email, phone, created_at FROM customers WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  return res.json(rows[0]);
});

// Búsqueda por nombre/email con cursor/limit
router.get("/customers", async (req, res) => {
  const search = String(req.query.search || "").trim();
  const cursor = Number(req.query.cursor || 0);
  const limit = Math.min(Number(req.query.limit || 20), 100);

  const pool = await getPool();
  const params = [];
  let where = "deleted_at IS NULL";

  if (search) {
    where += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (cursor) {
    where += " AND id > ?";
    params.push(cursor);
  }

  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, created_at
     FROM customers
     WHERE ${where}
     ORDER BY id ASC
     LIMIT ?`,
    [...params, limit + 1]
  );

  //#Determina nextCursor si hay mas filas
  let nextCursor = null;
  let data = rows;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    nextCursor = last.id;
    data = rows.slice(0, limit);
  }

  return res.json({ data, nextCursor });
});

// Updaet
router.put("/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const { error, value } = updateCustomerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const fields = [];
  const params = [];
  if (value.name !== undefined) { fields.push("name = ?"); params.push(value.name); }
  if (value.email !== undefined) { fields.push("email = ?"); params.push(value.email); }
  if (value.phone !== undefined) { fields.push("phone = ?"); params.push(value.phone || null); }

  if (!fields.length) return res.status(400).json({ error: "No fields" });

  const pool = await getPool();

  try {
    const [result] = await pool.execute(
      `UPDATE customers SET ${fields.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      [...params, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });

    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, created_at FROM customers WHERE id = ?",
      [id]
    );
    return res.json(rows[0]);
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
});

// Delete soft
router.delete("/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const pool = await getPool();
  const [result] = await pool.execute(
    "UPDATE customers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  return res.status(204).send();
});

// Endpoint int
router.get("/internal/customers/:id", serviceAuth, async (req, res) => {
  //#get con token
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const pool = await getPool();
  const [rows] = await pool.execute(
    "SELECT id, name, email, phone, created_at FROM customers WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  return res.json(rows[0]);
});

module.exports = router;