
const express = require("express");
const rateLimit = require("express-rate-limit");

const { optionalAuth } = require("../middleware/authMiddleware");
const { chat } = require("../controllers/aiController");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI requests. Please wait a minute.",
  },
});

router.post("/chat", aiLimiter, optionalAuth, chat);

module.exports = router;
