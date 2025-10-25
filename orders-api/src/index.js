require("dotenv").config();
const express = require("express");
const { jwtAuth } = require("./middleware/jwtAuth");
const ordersRouter = require("./routes/orders");

const app = express();
app.use(express.json());

//#Health
app.get("/health", (_req,res)=>res.json({ok:true, service:"orders-api"}));

//#JWT
app.use(jwtAuth);

//#Rutas de órdenes
app.use(ordersRouter);

const port = Number(process.env.PORT || 3002);
app.listen(port, "0.0.0.0", ()=>console.log(`[orders-api] listening on ${port}`));