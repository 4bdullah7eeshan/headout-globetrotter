const { Router } = require("express");
const { newRound, answerRound } = require("../controllers/round");

const roundRouter = Router();

// GET /api/rounds/new?userId=xxx
roundRouter.get("/new", newRound);

// POST /api/rounds/:roundId/answer
roundRouter.post("/:roundId/answer", answerRound);

module.exports = roundRouter;
