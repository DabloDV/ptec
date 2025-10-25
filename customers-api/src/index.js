require("dotenv").config();
const express = require("express");
const customersRouter = require("./routes/customers");
const { jwtAuth } = require("./middleware/jwtAuth");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "customers-api" }));

//#Aplica JWT
app.use(jwtAuth);

//#Rutas de Customers
app.use(customersRouter);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[customers-api] listening on port ${port}`);
});