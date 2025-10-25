//App factory
require("dotenv").config();
const express = require("express");
const { jwtAuth } = require("./middleware/jwtAuth");
const ordersRouter = require("./routes/orders");

const app = express();
app.use(express.json());

//Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "orders-api" }));

//JWT
app.use(jwtAuth);

//Rutas
app.use(ordersRouter);

module.exports = { app };