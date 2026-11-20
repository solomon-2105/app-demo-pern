const jwt = require("jsonwebtoken");
const config = require("../config");
const { AppError } = require("../errors");

module.exports = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token)
    return next(new AppError(401, "UNAUTHENTICATED", "Missing token"));
  try {
    // pin the algorithm: never let the token choose how it is verified
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
    req.userId = Number(payload.sub);
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Invalid or expired token"));
  }
};