const { Router } = require("express");
const { getUserScore, createGuestUser } = require("../controllers/user");

const userRouter = Router();

// GET /api/users/:userId/score
userRouter.get("/:userId/score", getUserScore);

// New endpoint to create a guest user
userRouter.post("/create-guest", createGuestUser);

module.exports = userRouter;
