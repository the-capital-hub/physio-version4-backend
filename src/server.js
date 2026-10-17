
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Route imports
const aiRoutes = require("./routes/aiRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const physiotherapistPortalRoutes = require(
  "./routes/physiotherapistPortalRoutes"
);
const appointmentRoutes = require("./routes/appointmentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Rehabics API is running",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// AI routes
app.use("/api/ai", aiRoutes);

// Physiotherapist portal routes
app.use(
  "/api/physiotherapist-portal",
  physiotherapistPortalRoutes
);

// Appointment routes
// IMPORTANT: Register before the 404 handler
app.use("/api/appointments", appointmentRoutes);

// Handle unknown API routes
// Keep this after every API route
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// General error handler
// Keep this as the final middleware
app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      err.status && err.status < 500
        ? err.message
        : "Internal server error",
  });
});

// Start server after MongoDB connects
async function startServer() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URL;

    if (!mongoUri) {
      throw new Error(
        "MongoDB connection URL missing in .env"
      );
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Rehabics API running at http://localhost:${PORT}`);
      console.log("Health API: /api/health");
      console.log("Auth API: /api/auth");
      console.log("Admin API: /api/admin");
      console.log("AI API: /api/ai");
      console.log("Physiotherapist API: /api/physiotherapist-portal");
      console.log("Appointments API: /api/appointments");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
