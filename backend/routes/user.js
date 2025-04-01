const { Router } = require("express");
const { getUserScore, createGuestUser } = require("../controllers/user");
const { getAllRoundsOfAUser } = require("../controllers/round");

const userRouter = Router();

// GET /api/users/:userId/score
userRouter.get("/:userId/score", getUserScore);

userRouter.get('/:userId/history', getAllRoundsOfAUser);


// New endpoint to create a guest user
userRouter.post("/create-guest", createGuestUser);

module.exports = userRouter;
