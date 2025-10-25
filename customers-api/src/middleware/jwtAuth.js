const jwt = require("jsonwebtoken");

function jwtAuth(req, res, next) {
  const u = req.originalUrl || req.url || "";
  if (/^\/health\/?(\?.*)?$/.test(u)) return next();

  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
module.exports = { jwtAuth };