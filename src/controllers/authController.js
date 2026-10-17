const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

const createToken = (user) => {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "replace_with_a_long_random_secret"
  ) {
    throw new Error(
      "JWT_SECRET must be set to a strong, private value in .env",
    );
  }
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

exports.register = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const phone =
      typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    const role =
      req.body.role === "physiotherapist"
        ? "physiotherapist"
        : req.body.role === "patient" || !req.body.role
          ? "patient"
          : null;

    if (name.length < 2)
      return res
        .status(400)
        .json({ success: false, message: "Please enter your full name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter a valid email address.",
        });
    if (!/^\+?[0-9\s()]{10,16}$/.test(phone))
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter a valid phone number.",
        });
    if (password.length < 8)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
    if (!role)
      return res
        .status(400)
        .json({ success: false, message: "Invalid account role." });

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser)
      return res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists.",
        });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    });
    const token = createToken(user);

    return res
      .status(201)
      .json({
        success: true,
        message: "Account created successfully.",
        token,
        user: publicUser(user),
      });
  } catch (error) {
    if (error && error.code === 11000)
      return res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists.",
        });
    console.error("Register error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Unable to create account right now." });
  }
};

exports.login = async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter your email and password.",
        });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const token = createToken(user);
    return res
      .status(200)
      .json({
        success: true,
        message: "Signed in successfully.",
        token,
        user: publicUser(user),
      });
  } catch (error) {
    console.error("Login error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Unable to sign in right now." });
  }
};

exports.getMe = async (req, res) =>
  res.status(200).json({ success: true, user: publicUser(req.user) });
