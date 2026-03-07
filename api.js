// lib/api.js
// Drop-in replacement for the mock EMPLOYEE_DB functions in +Page.jsx
// Point VITE_API_URL to your backend in .env

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetch employee details by ID from MongoDB.
 * Returns the employee object or null if not found.
 */
export async function fetchEmployee(id) {
  if (!id || id.trim().length < 3) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/employees/${id.trim().toUpperCase()}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error("[fetchEmployee]", err);
    return null;
  }
}

/**
 * Save a new employee to MongoDB.
 */
export async function saveEmployee(id, data) {
  const res = await fetch(`${BASE_URL}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, employeeId: id.trim().toUpperCase() }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to save employee");
  return true;
}

/**
 * Send salary slip email via Brevo and save salary record.
 * Call this instead of (or after) generating the PDF.
 * Returns { emailSent: boolean, message: string }
 */
export async function sendSalarySlip(formData, isNewJoinee) {
  const res = await fetch(`${BASE_URL}/api/salary/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...formData, isNewJoinee }),
  });
  const json = await res.json();
  return json; // { success, message, emailSent, emailError, salaryRecord }
}

/**
 * Get salary history for an employee.
 */
export async function getSalaryHistory(employeeId) {
  const res = await fetch(`${BASE_URL}/api/salary/history/${employeeId.toUpperCase()}`);
  const json = await res.json();
  return json.success ? json.data : [];
}
