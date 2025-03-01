const express = require("express");
const cors = require("cors");

const app = express();

// Enable CORS for all origins
app.use(cors());

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import route modules
const profileRouter = require("./routes/profile");
const roundRouter = require("./routes/round");
const userRouter = require("./routes/user");

// Mount routes
app.use("/api/profiles", profileRouter);
app.use("/api/rounds", roundRouter);
app.use("/api/users", userRouter);

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the Travelling Guessing Game API!");
});

// Global error handler (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}!`);
});
