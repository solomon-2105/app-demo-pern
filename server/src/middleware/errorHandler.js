const { AppError } = require("../errors");

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Malformed JSON body" },
    });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
    });
  }
  console.error(err);
  req.log.error({ err }, "unhandled error");
  res.status(500).json({ error: { code: "INTERNAL", message: "Server error" } });
};