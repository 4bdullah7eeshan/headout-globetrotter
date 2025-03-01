const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * GET /api/rounds/new?userId=xxx
 *
 * Creates a new round:
 * 1. Randomly picks a city.
 * 2. Selects 1–2 random CLUE descriptions from that city.
 * 3. Prepares answer options (4 in total: the correct answer plus distractors).
 * 4. Creates a round record linking clues, options, correct answer, and the playing user.
 */
const newRound = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: "Missing userId in query" });
  }

  // 1. Pick a random city.
  const cityCount = await prisma.city.count();
  if (cityCount === 0) {
    return res.status(404).json({ message: "No cities available" });
  }
  const randomOffset = Math.floor(Math.random() * cityCount);
  const cities = await prisma.city.findMany({
    skip: randomOffset,
    take: 1,
    include: {
      description: {
        where: { type: "CLUE" }
      }
    }
  });
  const chosenCity = cities[0];
  if (!chosenCity) {
    return res.status(404).json({ message: "City not found" });
  }

  // 2. Select 1–2 random CLUE descriptions.
  const clues = chosenCity.description; // already filtered by type
  let selectedClues = [];
  if (clues.length > 0) {
    const numberOfClues = Math.min(clues.length, Math.floor(Math.random() * 2) + 1);
    selectedClues = clues.sort(() => Math.random() - 0.5).slice(0, numberOfClues);
  }

  // 3. Prepare answer options.
  // We want 4 options total (one correct + 3 distractors).
  const numOptions = 4;
  const allCities = await prisma.city.findMany({
    select: { id: true, name: true }
  });
  const distractors = allCities.filter(city => city.id !== chosenCity.id);
  distractors.sort(() => Math.random() - 0.5);
  const selectedDistractors = distractors.slice(0, numOptions - 1);
  const options = [...selectedDistractors, { id: chosenCity.id, name: chosenCity.name }];
  options.sort(() => Math.random() - 0.5);

  // 4. Create a new round record.
  const round = await prisma.round.create({
    data: {
      clue: {
        connect: selectedClues.map(clue => ({ id: clue.id }))
      },
      options: {
        connect: options.map(opt => ({ id: opt.id }))
      },
      correctAnswer: {
        connect: { id: chosenCity.id }
      },
      user: {
        connect: { id: Number(userId) }
      }
    },
    include: {
      clue: true,
      options: true,
      correctAnswer: true,
      user: true
    }
  });

  // Return the round details (do not reveal the correct answer to the frontend).
  res.json({
    roundId: round.id,
    clue: selectedClues,
    options: options
  });
});

/**
 * POST /api/rounds/:roundId/answer
 *
 * Submits the user's answer:
 * 1. Checks whether the submitted answer matches the correct answer.
 * 2. Retrieves a FUN_FACT description for feedback.
 * 3. Updates the round with the user's answer.
 * 4. Updates the user's score (incrementing correct or wrong answer count).
 */
const answerRound = asyncHandler(async (req, res) => {
  const { roundId } = req.params;
  const { userAnswerId } = req.body;
  if (!userAnswerId) {
    return res.status(400).json({ message: "Missing userAnswerId in request body" });
  }

  // Retrieve the round along with its correct answer and playing user.
  const round = await prisma.round.findUnique({
    where: { id: Number(roundId) },
    include: {
      correctAnswer: true,
      clue: true,
      user: true
    }
  });
  if (!round) {
    return res.status(404).json({ message: "Round not found" });
  }

  // Determine if the answer is correct.
  const isCorrect = round.correctAnswer.id === Number(userAnswerId);

  // Retrieve a fun fact from the correct city's descriptions.
  const funFact = await prisma.cityDescription.findFirst({
    where: {
      cityId: round.correctAnswer.id,
      type: "FUN_FACT"
    },
    orderBy: { id: "asc" }
  });

  // Update the round record with the user's answer.
  await prisma.round.update({
    where: { id: round.id },
    data: {
      userAnswer: { connect: { id: Number(userAnswerId) } }
    }
  });

  // Update the user's score.
  let updatedUser;
  if (isCorrect) {
    updatedUser = await prisma.user.update({
      where: { id: round.user.id },
      data: { numberOfCorrectAnswers: { increment: 1 } }
    });
  } else {
    updatedUser = await prisma.user.update({
      where: { id: round.user.id },
      data: { numberOfWrongAnswers: { increment: 1 } }
    });
  }

  // Calculate the percentage score.
  const total = updatedUser.numberOfCorrectAnswers + updatedUser.numberOfWrongAnswers;
  const percentage = total > 0 ? (updatedUser.numberOfCorrectAnswers / total) * 100 : 0;

  res.json({
    correct: isCorrect,
    feedback: isCorrect
      ? `🎉 Correct! ${funFact ? funFact.description : ""}`
      : `😢 Incorrect! ${funFact ? funFact.description : ""}`,
    updatedScore: {
      numberOfCorrectAnswers: updatedUser.numberOfCorrectAnswers,
      numberOfWrongAnswers: updatedUser.numberOfWrongAnswers,
      percentage: percentage.toFixed(2)
    }
  });
});

module.exports = {
  newRound,
  answerRound
};
