const { app } = require("./app");

const port = Number(process.env.PORT || 3002);
app.listen(port, "0.0.0.0", () => {
  console.log(`[orders-api] listening on ${port}`);
});