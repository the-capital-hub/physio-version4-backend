const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: 20,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    role: {
      type: String,
      enum: ["patient", "physiotherapist", "admin"],
      default: "patient",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
