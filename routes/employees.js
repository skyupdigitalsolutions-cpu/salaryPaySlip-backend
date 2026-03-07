import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Employee from "../models/Employee.js";

const router = Router();

// ── Helper: send validation errors ──────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ── GET /api/employees/:employeeId ───────────────────────────────────────────
// Fetch employee by ID → auto-fill form fields
router.get(
  "/:employeeId",
  param("employeeId").trim().notEmpty().withMessage("Employee ID is required"),
  validate,
  async (req, res) => {
    try {
      const id = req.params.employeeId.toUpperCase().trim();
      const employee = await Employee.findOne({ employeeId: id, isActive: true }).lean();

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: `No employee found with ID: ${id}`,
        });
      }

      // Return only the fields the form needs
      return res.json({
        success: true,
        data: {
          employeeId:    employee.employeeId,
          employeeName:  employee.employeeName,
          designation:   employee.designation,
          department:    employee.department,
          dateOfJoining: employee.dateOfJoining,
          bankName:      employee.bankName,
          bankAcNo:      employee.bankAcNo,
          email:         employee.email,
        },
      });
    } catch (err) {
      console.error("[GET employee]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── GET /api/employees ───────────────────────────────────────────────────────
// List all active employees (for admin purposes)
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .select("-__v -isActive")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    console.error("[GET employees]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── POST /api/employees ──────────────────────────────────────────────────────
// Create a new employee (new joinee)
router.post(
  "/",
  [
    body("employeeId").trim().notEmpty().withMessage("Employee ID is required"),
    body("employeeName").trim().notEmpty().withMessage("Name is required"),
    body("designation").trim().notEmpty().withMessage("Designation is required"),
    body("department").trim().notEmpty().withMessage("Department is required"),
    body("dateOfJoining").trim().notEmpty().withMessage("Date of joining is required"),
    body("bankName").trim().notEmpty().withMessage("Bank name is required"),
    body("bankAcNo").trim().notEmpty().withMessage("Bank A/C number is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  ],
  validate,
  async (req, res) => {
    try {
      const id = req.body.employeeId.trim().toUpperCase();

      // Check duplicate
      const existing = await Employee.findOne({ employeeId: id });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Employee ${id} already exists. Use PUT to update.`,
        });
      }

      const employee = new Employee({ ...req.body, employeeId: id });
      await employee.save();

      return res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: employee,
      });
    } catch (err) {
      console.error("[POST employee]", err);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "Employee ID already exists" });
      }
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── PUT /api/employees/:employeeId ───────────────────────────────────────────
// Update an existing employee
router.put(
  "/:employeeId",
  [
    param("employeeId").trim().notEmpty(),
    body("employeeName").optional().trim().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  validate,
  async (req, res) => {
    try {
      const id = req.params.employeeId.toUpperCase().trim();
      const updates = { ...req.body };
      delete updates.employeeId; // Don't allow ID change via body

      const employee = await Employee.findOneAndUpdate(
        { employeeId: id },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!employee) {
        return res.status(404).json({ success: false, message: `Employee ${id} not found` });
      }

      return res.json({ success: true, message: "Employee updated", data: employee });
    } catch (err) {
      console.error("[PUT employee]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

export default router;
