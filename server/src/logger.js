const pino = require("pino");
const config = require("./config");

module.exports = pino({
  level: config.NODE_ENV === "test" ? "silent" : "info",
  redact: ["req.headers.authorization"],
});