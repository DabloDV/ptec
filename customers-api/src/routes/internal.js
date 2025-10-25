const express = require('express');
const { pool } = require('../db');                 
const { serviceAuth } = require('../middleware/serviceAuth');

const router = express.Router();


router.get('/internal/customers/:id', serviceAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' });

  const [rows] = await pool.execute(
    'SELECT id, name, email, phone, created_at FROM customers WHERE id=?',
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not_found' });

  res.json(rows[0]);
});

module.exports = router;
