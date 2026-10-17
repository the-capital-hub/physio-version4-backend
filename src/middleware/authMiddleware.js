const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, message: "Authentication token is required." });
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_long_random_secret") {
      return res.status(500).json({ success: false, message: "Server authentication is not configured." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: "This account is no longer available." });

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Your session is invalid or expired. Please sign in again." });
    }
    console.error("Auth middleware error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to verify authentication." });
  }
};

exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
  }
  return next();
};

exports.optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    // Public visitors can continue without a token.
    if (!header) {
      req.user = null;
      return next();
    }

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET === "replace_with_a_long_random_secret"
    ) {
      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured.",
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "This account is no longer available.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or expired.",
      });
    }

    console.error("Optional auth error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify authentication.",
    });
  }
};
