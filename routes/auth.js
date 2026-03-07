import { Router } from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  "/login",
  [
    // Changed: validate username (non-empty string) instead of email format
    body("username").notEmpty().withMessage("Username is required").trim(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res) => {
    try {
      // Changed: destructure username instead of email
      const { username, password } = req.body;

      // Changed: look up admin by name field instead of email
      const admin = await Admin.findOne({ name: username, isActive: true });
      if (!admin) {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      const token = jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (err) {
      console.error("[POST /auth/login]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  return res.json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      lastLogin: req.admin.lastLogin,
    },
  });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", authMiddleware, (req, res) => {
  return res.json({ success: true, message: "Logged out successfully." });
});

export default router;