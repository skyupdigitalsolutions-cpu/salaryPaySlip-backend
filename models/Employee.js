import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    employeeName: { type: String, required: true, trim: true },
    designation:  { type: String, required: true, trim: true },
    department:   { type: String, required: true, trim: true },
    dateOfJoining:{ type: String, required: true }, // stored as "YYYY-MM-DD"
    bankName:     { type: String, required: true, trim: true },
    bankAcNo:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    isActive:     { type: Boolean, default: true },
  },
  {
    timestamps: true, // createdAt + updatedAt
    collection: "employees",
  }
);

export default mongoose.model("Employee", employeeSchema);
