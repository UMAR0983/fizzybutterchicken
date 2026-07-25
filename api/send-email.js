// POST /api/send-email
// Body: { name, email }
// Sends check-in confirmation email via Gmail SMTP using Nodemailer.

const nodemailer = require('nodemailer');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing recipient email.' });

    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('GMAIL_USER / GMAIL_APP_PASS env vars not set. Email notification simulated for:', email);
      return res.status(200).json({
        ok: true,
        simulated: true,
        message: 'Gmail credentials (GMAIL_USER / GMAIL_APP_PASS or SMTP_USER / SMTP_PASS) missing in Vercel. Email simulated.'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: `"Fizzy's Butter Chicken" <${smtpUser}>`,
      to: email,
      subject: "You're checked in — Fizzy's Butter Chicken",
      html: `
        <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:520px; margin:0 auto; padding:24px; border:1px solid #4A4038; background-color:#14100D; color:#EDE6DA; border-radius:4px;">
          <h2 style="color:#C89B3C; margin-top:0; font-weight:500;">Welcome in, ${name ? name : 'guest'}!</h2>
          <p>You've been checked in at Fizzy's Butter Chicken. Your table will be ready shortly.</p>
          <p>Thanks for dining with us tonight.</p>
          <hr style="border:none; border-top:1px solid #4A4038; margin:20px 0;" />
          <p style="color:#B9AF9F; font-size:12px; margin:0;">Fizzy's Butter Chicken · 36 James Street, Parry Sound, Ontario · <a href="https://fizzybutterchicken.vercel.app" style="color:#C89B3C; text-decoration:none;">fizzybutterchicken.vercel.app</a></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Gmail SMTP email successfully sent to:', email);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-email.js Gmail SMTP error:', err);
    return res.status(500).json({ error: 'Could not send email via Gmail SMTP: ' + err.message });
  }
};
