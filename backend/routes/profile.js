const { Router } = require("express");
const { 
  registerProfile, 
  getProfile, 
  generateInvite, 
  getInviteProfile 
} = require("../controllers/profile");

const profileRouter = Router();

// POST /api/profiles/register
profileRouter.post("/register", registerProfile);

// GET /api/profiles/:username
profileRouter.get("/:username", getProfile);

// POST /api/profiles/:username/invite
profileRouter.post("/:username/invite", generateInvite);

// GET /api/profiles/invite/:username
profileRouter.get("/invite/:username", getInviteProfile);

module.exports = profileRouter;
