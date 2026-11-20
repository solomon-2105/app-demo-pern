const { AppError } = require("../errors");

module.exports = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "Invalid request",
        result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }))
      )
    );
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};