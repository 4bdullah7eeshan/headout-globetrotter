const { Router } = require("express");
const { getUserScore } = require("../controllers/user");

const userRouter = Router();

// GET /api/users/:userId/score
userRouter.get("/:userId/score", getUserScore);

module.exports = userRouter;
