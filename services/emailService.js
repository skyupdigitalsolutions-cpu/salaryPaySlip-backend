import { BrevoClient } from "@getbrevo/brevo";

// ── Initialize Brevo client ──────────────────────────────────────────────────
const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

// ── Number → Indian words ────────────────────────────────────────────────────
function numberToWords(num) {
  if (!num || num === 0) return "Zero";
  const ones  = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine"];
  const teens = ["Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens  = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const sub = (n) => {
    if (n === 0)  return "";
    if (n < 10)   return ones[n];
    if (n < 20)   return teens[n - 10];
    if (n < 100)  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + sub(n % 100) : "");
  };
  const cr = Math.floor(num / 10000000);
  const lk = Math.floor((num % 10000000) / 100000);
  const th = Math.floor((num % 100000) / 1000);
  const rm = num % 1000;
  return [cr && sub(cr) + " Crore", lk && sub(lk) + " Lakh", th && sub(th) + " Thousand", rm && sub(rm)]
    .filter(Boolean).join(" ").trim();
}

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

// ── Email body ───────────────────────────────────────────────────────────────
function buildEmailBody(data) {
  const { employeeName, payMonth, isNewJoinee } = data;
  const totalEarnings  = (Number(data.basicSalary) || 0) + (Number(data.incentivePay) || 0) + (Number(data.travelAllowance) || 0);
  const totalDeduction = Number(data.lossOfPay) || 0;
  const netSalary      = totalEarnings - totalDeduction;
  const payMonthLabel  = payMonth
    ? new Date(payMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "—";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:40px 20px;background:#ffffff;font-family:Arial,sans-serif;color:#222;font-size:14px;line-height:1.8;">
  <p>Dear ${employeeName},</p>
  <p>${isNewJoinee ? `Welcome to <strong>Skyup Digital Solutions!</strong> We are pleased to have you on board.` : `Hope this email finds you well.`}
    Please find your salary slip for <strong>${payMonthLabel}</strong> attached to this email.
  </p>
  <p><strong>Net Salary: &#x20B9; ${fmt(netSalary)}</strong><br/>
    (${numberToWords(Math.round(netSalary))} Rupees Only)
  </p>
  <p>Total Earnings: &#x20B9; ${fmt(totalEarnings)}<br/>
    Total Deductions: &#x20B9; ${fmt(totalDeduction)}
  </p>
  <p>This is a system-generated email. Please do not reply to this email directly.<br/>
  For any queries, contact HR at <a href="mailto:contact@skyupdigital.com" style="color:#0037CA;">contact@skyupdigital.com</a> or call +91 9538752960.</p>
  <br/>
  <p>Regards,<br/><strong>HR Team</strong><br/>Skyup Digital Solutions<br/>
    Parinidhi #23, E Block, 14A Main Road, 2nd Floor,<br/>Sahakaranagar, Bangalore – 560092
  </p>
</body>
</html>`;
}

// ── Send salary slip email with image attachment ─────────────────────────────
export async function sendSalarySlipEmail(data) {
  const { email, employeeName, payMonth, slipImageData } = data;

  if (!slipImageData) {
    throw new Error("slipImageData is required");
  }

  console.log(`[Email] Sending slip for ${employeeName} → ${email}`);

  // slipImageData is "data:image/jpeg;base64,....." — strip the prefix
  const base64Image = slipImageData.replace(/^data:image\/\w+;base64,/, "");

  const fileName = `Salary_Slip_${(employeeName || "Employee").replace(/\s+/g, "_")}_${payMonth || "Slip"}.jpg`;

  const payload = {
    subject: `Salary Slip for ${payMonth ? new Date(payMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Slip"} – Skyup Digital Solutions`,
    htmlContent: buildEmailBody(data),
    sender: {
      name:  process.env.BREVO_SENDER_NAME  || "Skyup Digital Solutions",
      email: process.env.BREVO_SENDER_EMAIL || "skyupdigitalsolutions@gmail.com",
    },
    to: [{ email, name: employeeName }],
    replyTo: {
      email: process.env.BREVO_SENDER_EMAIL || "skyupdigitalsolutions@gmail.com",
      name:  "Skyup HR",
    },
    attachment: [{ name: fileName, content: base64Image }],
  };

  let result;
  if (client.smtp?.sendTransacEmail) {
    result = await client.smtp.sendTransacEmail(payload);
  } else if (client.transactionalEmails?.sendTransacEmail) {
    result = await client.transactionalEmails.sendTransacEmail(payload);
  } else {
    throw new Error("Brevo send method not found.");
  }

  console.log(`[Email] ✅ Sent to ${email}`);
  return result;
}
