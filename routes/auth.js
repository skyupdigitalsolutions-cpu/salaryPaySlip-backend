import { Router } from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/Admin.js";
import authMiddleware from "../middleware/auth.js";
import { sendOtpEmail } from "../services/emailService.js";

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
    body("username").notEmpty().withMessage("Username is required").trim(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { username, password } = req.body;

      const admin = await Admin.findOne({ name: username, isActive: true });
      if (!admin) {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
      }

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

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post(
  "/forgot-password",
  [body("ownerEmail").isEmail().withMessage("Valid owner email is required")],
  validate,
  async (req, res) => {
    try {
      // Manually normalize for comparison
      const enteredEmail = (req.body.ownerEmail || "").toLowerCase().trim();
      const ownerEmailEnv = (process.env.OWNER_EMAIL || "").toLowerCase().trim();

      console.log("ENTERED:", enteredEmail);
      console.log("ENV    :", ownerEmailEnv);
      console.log("MATCH  :", enteredEmail === ownerEmailEnv);

      if (enteredEmail !== ownerEmailEnv) {
        return res.status(400).json({ success: false, message: "Owner email does not match our records." });
      }

      const admin = await Admin.findOne({ isActive: true });
      if (!admin) {
        return res.status(400).json({ success: false, message: "No active admin found." });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);

      admin.resetOtp = otp;
      admin.resetOtpExpiry = expiry;
      await admin.save();

      // Send OTP to owner Gmail
      await sendOtpEmail({ email: enteredEmail, name: "Admin Owner", otp });

      return res.json({ success: true, message: "OTP sent to owner Gmail. It expires in 10 minutes." });
    } catch (err) {
      console.error("[POST /auth/forgot-password]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── POST /api/auth/verify-otp ───────────────────────────────────────────────
router.post(
  "/verify-otp",
  [
    body("ownerEmail").isEmail().withMessage("Valid owner email is required"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  validate,
  async (req, res) => {
    try {
      const enteredEmail = (req.body.ownerEmail || "").toLowerCase().trim();
      const ownerEmailEnv = (process.env.OWNER_EMAIL || "").toLowerCase().trim();

      if (enteredEmail !== ownerEmailEnv) {
        return res.status(400).json({ success: false, message: "Owner email does not match our records." });
      }

      const { otp } = req.body;

      const admin = await Admin.findOne({ isActive: true });
      if (!admin || !admin.resetOtp || !admin.resetOtpExpiry) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
      }

      if (new Date() > admin.resetOtpExpiry) {
        admin.resetOtp = null;
        admin.resetOtpExpiry = null;
        await admin.save();
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
      }

      if (admin.resetOtp !== otp) {
        return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
      }

      const resetToken = jwt.sign(
        { id: admin._id, purpose: "password-reset" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      admin.resetOtp = null;
      admin.resetOtpExpiry = null;
      await admin.save();

      return res.json({ success: true, resetToken });
    } catch (err) {
      console.error("[POST /auth/verify-otp]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post(
  "/reset-password",
  [
    body("resetToken").notEmpty().withMessage("Reset token is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;

      let payload;
      try {
        payload = jwt.verify(resetToken, process.env.JWT_SECRET);
      } catch {
        return res.status(400).json({ success: false, message: "Reset token is invalid or expired." });
      }

      if (payload.purpose !== "password-reset") {
        return res.status(400).json({ success: false, message: "Invalid reset token." });
      }

      const admin = await Admin.findById(payload.id);
      if (!admin || !admin.isActive) {
        return res.status(400).json({ success: false, message: "Admin not found." });
      }

      admin.password = newPassword;
      await admin.save();

      return res.json({ success: true, message: "Password reset successfully. You can now log in." });
    } catch (err) {
      console.error("[POST /auth/reset-password]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

export default router;
