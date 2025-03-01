const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


/**
 * POST /api/users/create-guest
 * Creates a guest user with default values.
 */
const createGuestUser = asyncHandler(async (req, res) => {
    const user = await prisma.user.create({
      data: {
        numberOfCorrectAnswers: 0,
        numberOfWrongAnswers: 0,
      }
    });
    res.status(201).json({ userId: user.id });
});

/**
 * GET /api/users/:userId/score
 *
 * Retrieves the user's score data.
 */
const getUserScore = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const total = user.numberOfCorrectAnswers + user.numberOfWrongAnswers;
  const percentage = total > 0 ? (user.numberOfCorrectAnswers / total) * 100 : 0;

  res.json({
    userId: user.id,
    numberOfCorrectAnswers: user.numberOfCorrectAnswers,
    numberOfWrongAnswers: user.numberOfWrongAnswers,
    percentage: percentage.toFixed(2)
  });
});

module.exports = {
  createGuestUser,
  getUserScore
};
