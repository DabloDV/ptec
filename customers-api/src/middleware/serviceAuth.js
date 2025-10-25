function serviceAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== process.env.SERVICE_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

module.exports = { serviceAuth };