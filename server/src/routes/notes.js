const router = require("express").Router();
const asyncHandler = require("../asyncHandler");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const schemas = require("../schemas/notes");
const notes = require("../services/notes");

router.use(auth);

router.get(
  "/",
  validate(schemas.listQuery, "query"),
  asyncHandler(async (req, res) => {
    res.json(await notes.list(req.userId, req.valid.query));
  })
);

router.post(
  "/",
  validate(schemas.noteCreate),
  asyncHandler(async (req, res) => {
    res.status(201).json(await notes.create(req.userId, req.valid.body));
  })
);

router.put(
  "/:id",
  validate(schemas.idParam, "params"),
  validate(schemas.noteUpdate),
  asyncHandler(async (req, res) => {
    res.json(await notes.update(req.userId, req.valid.params.id, req.valid.body));
  })
);

router.delete(
  "/:id",
  validate(schemas.idParam, "params"),
  asyncHandler(async (req, res) => {
    await notes.remove(req.userId, req.valid.params.id);
    res.sendStatus(204);
  })
);

module.exports = router;