
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");

async function createAdmin() {
  try {
    const uri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URL;

    if (!uri) {
      throw new Error("MongoDB connection URL .env mein nahi mila.");
    }

    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const phone = process.env.ADMIN_PHONE;
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !phone || !password) {
      throw new Error("Admin ki required environment values missing hain.");
    }

    if (password.length < 12) {
      throw new Error("Password kam se kam 12 characters ka rakho.");
    }

    await mongoose.connect(uri);

    const existing = await User.findOne({ email });

    if (existing) {
      throw new Error(
        "Is email ka account pehle se hai. Kisi existing account ko automatically admin nahi banaya."
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin account successfully created.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();
