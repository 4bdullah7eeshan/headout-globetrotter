const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

/**
 * POST /api/profiles/register
 *
 * Registers a visitor by creating a Profile.
 * Body must include:
 *  - username: unique username.
 *  - guestUserId: the existing User ID for the visitor.
 */
const registerProfile = asyncHandler(async (req, res) => {
  const { username, guestUserId } = req.body;
  if (!username || !guestUserId) {
    return res.status(400).json({ message: "username and guestUserId are required" });
  }

  // Ensure the username is unique.
  const existingProfile = await prisma.profile.findUnique({
    where: { username }
  });
  if (existingProfile) {
    return res.status(400).json({ message: "Username already taken" });
  }

  // Create the profile linked to the existing user.
  const profile = await prisma.profile.create({
    data: {
      username,
      user: { connect: { id: Number(guestUserId) } }
    }
  });

  res.status(201).json({
    profileId: profile.id,
    username: profile.username
  });
});

/**
 * GET /api/profiles/:username
 *
 * Retrieves the profile details including the user's score and rounds count.
 */
const getProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: { user: { include: { rounds: true } } }
  });

  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  res.json({
    profileId: profile.id,
    username: profile.username,
    userId: profile.userId,
    score: {
      numberOfCorrectAnswers: profile.user.numberOfCorrectAnswers,
      numberOfWrongAnswers: profile.user.numberOfWrongAnswers
    },
    roundsPlayed: profile.user.rounds.length
  });
});

/**
 * POST /api/profiles/:username/invite
 *
 * Generates an invitation for the profile.
 * This endpoint creates a dynamic invite code, share image URL, and invite link.
 * The response includes the inviter’s public details (username and score) so that
 * the invited friend can see the invitee’s score before playing.
 */
const generateInvite = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).json({ message: "Missing username in request params" });
  }
  // Find the profile by username.
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: { user: true }
  });
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  // Generate a random invite code.
  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  
  // Construct a dynamic share image URL. (You can integrate with a 3rd-party image generator.)
  const shareImageUrl = `https://yourimagegen.com/api/image?code=${inviteCode}&user=${profile.username}`;
  
  // Construct the invite link.
  const inviteLink = `https://yourapp.com/invite/${inviteCode}?inviter=${profile.username}`;

  res.json({
    inviteCode,
    inviteLink,
    shareImageUrl,
    inviter: {
      username: profile.username,
      score: {
        numberOfCorrectAnswers: profile.user.numberOfCorrectAnswers,
        numberOfWrongAnswers: profile.user.numberOfWrongAnswers
      }
    }
  });
});

/**
 * GET /api/profiles/invite/:username
 *
 * Retrieves public invitation details for a given profile (inviter).
 * This allows an invited friend to see the invitee’s score before playing.
 */
const getInviteProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: { user: true }
  });
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }
  res.json({
    username: profile.username,
    score: {
      numberOfCorrectAnswers: profile.user.numberOfCorrectAnswers,
      numberOfWrongAnswers: profile.user.numberOfWrongAnswers
    }
  });
});

module.exports = {
  registerProfile,
  getProfile,
  generateInvite,
  getInviteProfile
};
