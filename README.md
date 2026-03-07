# Skyup Digital – Salary Slip Backend

Node.js + Express + MongoDB backend for the Salary Slip Generator.
Connects to **MongoDB Atlas** and sends salary slip emails via **Brevo (Sendinblue)**.

---

## 📁 Project Structure

```
salary-backend/
├── server.js                      ← Express entry point
├── .env.example                   ← Copy to .env and fill in values
├── models/
│   ├── Employee.js                ← MongoDB Employee schema
│   └── SalaryRecord.js            ← MongoDB Salary Record schema
├── routes/
│   ├── employees.js               ← CRUD for employees
│   └── salary.js                  ← Send salary slip + history
├── services/
│   └── emailService.js            ← Brevo email + HTML template
├── scripts/
│   └── seed.js                    ← Seed mock employees to MongoDB
└── frontend-integration/
    └── lib/api.js                 ← Drop this into your frontend /lib folder
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd salary-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb+srv://rathnabhoomidevelopers_db_user:Z9dzxSCfjlSYZNkL@rbdcrm.rk7usja.mongodb.net/salarydb
PORT=5000
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_NAME=Skyup Digital Solutions
BREVO_SENDER_EMAIL=hr@skyupdigital.com
FRONTEND_URL=http://localhost:3000
```

### 3. Get Brevo API Key
1. Sign up / login at [app.brevo.com](https://app.brevo.com)
2. Go to **Settings → API Keys → Generate New API Key**
3. Copy and paste into `.env` as `BREVO_API_KEY`
4. Verify your sender email at **Settings → Senders & IPs → Senders**

### 4. Seed Employees into MongoDB
```bash
node scripts/seed.js
```
This migrates the 4 mock employees (EMP001–EMP004) into your MongoDB Atlas database.

### 5. Start the Server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at: **http://localhost:5000**

---

## 🔌 API Endpoints

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/employees/:id` | **Fetch employee by ID** → auto-fills form fields |
| `GET` | `/api/employees` | List all active employees |
| `POST` | `/api/employees` | Create new employee (new joinee) |
| `PUT` | `/api/employees/:id` | Update employee details |

### Salary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/salary/send` | **Save salary record + send email** |
| `GET` | `/api/salary/history/:id` | Get salary history for employee |
| `POST` | `/api/salary/resend-email` | Resend salary slip email |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server + MongoDB health check |

---

## 🔧 Frontend Integration

### Step 1: Add VITE_API_URL to your frontend `.env`
```
VITE_API_URL=http://localhost:5000
```

### Step 2: Copy `frontend-integration/lib/api.js` into your frontend
Place it at `salaryform/lib/api.js`

### Step 3: Update `+Page.jsx`

Replace the mock functions at the top of `+Page.jsx`:

**Remove** these lines:
```js
const EMPLOYEE_DB = { ... };
async function fetchEmployee(id) { ... }
async function saveEmployee(id, data) { ... }
```

**Add** at the top:
```js
import { fetchEmployee, saveEmployee, sendSalarySlip } from "../lib/api.js";
```

### Step 4: Hook up the email send in `handleGeneratePDF`

Find the `// TODO: send PDF to formik.values.email` comment in `+Page.jsx` and replace it:

```js
// After PDF is generated, send email via backend
const result = await sendSalarySlip(formik.values, isNewJoinee);
if (result.emailSent) {
  showToast(`✅ Salary slip emailed to ${formik.values.email}`);
} else {
  showToast(`⚠️ PDF saved but email failed: ${result.emailError}`, "warning");
}
```

---

## 📧 How the Email Works

When `POST /api/salary/send` is called:

1. **If new joinee** → employee is saved to MongoDB automatically
2. Salary figures are computed (earnings, deductions, net)
3. A **Salary Record** is saved to `salary_records` collection
4. A **beautiful HTML email** is sent to the employee via Brevo with:
   - Full salary slip table (earnings & deductions)
   - Company header with logo
   - Net salary in words (Indian number system)
   - New Joinee welcome banner (if applicable)
   - Authorised signatory footer
5. Email sent status + timestamp is recorded in the salary record

---

## 🗄️ MongoDB Collections

### `employees`
Stores all employee master data. Auto-indexed on `employeeId`.

### `salary_records`
One document per employee per month. Compound unique index on `(employeeId, payMonth)` prevents duplicate slips.

---

## 🛡️ Security Features
- **Helmet** – HTTP security headers
- **Rate limiting** – 100 req/15min globally; 50 emails/hour
- **Input validation** – express-validator on all endpoints
- **CORS** – restricted to your frontend URL

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `mongoose` | MongoDB ODM |
| `@getbrevo/brevo` | Brevo email SDK |
| `cors` | Cross-origin requests |
| `helmet` | Security headers |
| `express-rate-limit` | Rate limiting |
| `express-validator` | Input validation |
| `morgan` | HTTP request logging |
| `dotenv` | Environment variables |
