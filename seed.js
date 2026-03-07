// scripts/seed.js
// Run once to seed the initial 4 mock employees into MongoDB:
//   node scripts/seed.js

import "dotenv/config";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";

const SEED_EMPLOYEES = [
  {
    employeeId:   "EMP001",
    employeeName: "Arjun Sharma",
    designation:  "Senior Engineer",
    department:   "Engineering",
    dateOfJoining:"2021-06-15",
    bankName:     "State Bank of India",
    bankAcNo:     "3847562910",
    email:        "arjun.sharma@skyupdigital.com",
  },
  {
    employeeId:   "EMP002",
    employeeName: "Priya Nair",
    designation:  "HR Manager",
    department:   "Human Resources",
    dateOfJoining:"2019-03-01",
    bankName:     "HDFC Bank",
    bankAcNo:     "5023918476",
    email:        "priya.nair@skyupdigital.com",
  },
  {
    employeeId:   "EMP003",
    employeeName: "Rahul Verma",
    designation:  "Project Manager",
    department:   "Operations",
    dateOfJoining:"2020-09-10",
    bankName:     "ICICI Bank",
    bankAcNo:     "7164829305",
    email:        "rahul.verma@skyupdigital.com",
  },
  {
    employeeId:   "EMP004",
    employeeName: "Kavitha Reddy",
    designation:  "UI/UX Designer",
    department:   "Design",
    dateOfJoining:"2022-01-20",
    bankName:     "Axis Bank",
    bankAcNo:     "9283746510",
    email:        "kavitha.reddy@skyupdigital.com",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB:", mongoose.connection.db.databaseName);

    for (const emp of SEED_EMPLOYEES) {
      const result = await Employee.findOneAndUpdate(
        { employeeId: emp.employeeId },
        { $set: emp },
        { upsert: true, new: true }
      );
      console.log(`  ✔ ${result.employeeId} – ${result.employeeName}`);
    }

    console.log("\n🎉 Seed complete! All employees are in MongoDB.");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
