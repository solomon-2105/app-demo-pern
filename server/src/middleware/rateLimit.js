const { rateLimit } = require("express-rate-limit");
const config = require("../config");

const make = (limit, windowMs) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.NODE_ENV === "test",
    handler: (req, res) =>
      res.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many requests, try again later" },
      }),
  });

module.exports = {
  authLimiter: make(10, 15 * 60 * 1000), // 10 login/register attempts per 15 min per IP
  apiLimiter: make(300, 60 * 1000),      // 300 requests per minute per IP
};