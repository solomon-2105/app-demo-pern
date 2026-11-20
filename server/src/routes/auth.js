const router = require("express").Router();
const jwt = require("jsonwebtoken");
const config = require("../config");
const asyncHandler = require("../asyncHandler");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimit");
const schemas = require("../schemas/auth");
const users = require("../services/users");

const sign = (id) =>
  jwt.sign({}, config.JWT_SECRET, {
    algorithm: "HS256",
    subject: String(id),
    expiresIn: "7d",
  });

router.post(
  "/register",
  authLimiter,
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await users.createUser(email, password);
    res.status(201).json({ token: sign(user.id), user });
  })
);

router.post(
  "/login",
  authLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await users.verifyCredentials(email, password);
    res.json({ token: sign(user.id), user });
  })
);

module.exports = router;