// POST /api/send-email
// Body: { name, email, type, reservationId, date, time, party }
// Sends reservation confirmation or check-in confirmation email via SMTP using Nodemailer.

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
    const { name, email, type, reservationId, date, time, party } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing recipient email.' });

    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials missing in Vercel. Email notification simulated for:', email);
      return res.status(200).json({
        ok: true,
        simulated: true,
        message: 'SMTP credentials missing in Vercel env vars. Email simulated.'
      });
    }

    // Auto-detect SMTP transport based on user domain
    let transporter;
    const lowerUser = smtpUser.toLowerCase();

    if (lowerUser.endsWith('@outlook.com') || lowerUser.endsWith('@hotmail.com') || lowerUser.endsWith('@live.com')) {
      transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          ciphers: 'SSLv3'
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }

    const isCheckin = type === 'checkin' || (!reservationId && !date);
    const subject = isCheckin
      ? `You're checked in — Fizzy's Butter Chicken`
      : `Reservation Confirmed (${reservationId || 'Pass'}) — Fizzy's Butter Chicken`;

    const passUrl = `https://fizzybutterchicken.vercel.app/card-viewer.html?id=${encodeURIComponent(reservationId || '')}`;

    const html = isCheckin
      ? `
        <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:520px; margin:0 auto; padding:24px; border:1px solid #4A4038; background-color:#14100D; color:#EDE6DA; border-radius:6px;">
          <h2 style="color:#C89B3C; margin-top:0; font-weight:500;">Welcome in, ${name ? name : 'guest'}!</h2>
          <p>You've been checked in at Fizzy's Butter Chicken. Your table is ready.</p>
          <p>Thank you for dining with us tonight!</p>
          <hr style="border:none; border-top:1px solid #4A4038; margin:20px 0;" />
          <p style="color:#B9AF9F; font-size:12px; margin:0;">Fizzy's Butter Chicken · 36 James Street, Parry Sound, Ontario · <a href="https://fizzybutterchicken.vercel.app" style="color:#C89B3C; text-decoration:none;">fizzybutterchicken.vercel.app</a></p>
        </div>
      `
      : `
        <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:520px; margin:0 auto; padding:24px; border:1px solid #4A4038; background-color:#14100D; color:#EDE6DA; border-radius:6px;">
          <h2 style="color:#C89B3C; margin-top:0; font-weight:500;">Reservation Confirmed!</h2>
          <p>Hello ${name ? name : 'Guest'},</p>
          <p>Your reservation at <strong>Fizzy's Butter Chicken</strong> has been confirmed and auto-approved.</p>
          <div style="background:#1F1915; border:1px solid #4A4038; padding:16px; border-radius:4px; margin:16px 0;">
            <p style="margin:4px 0;"><strong>Reservation ID:</strong> <span style="color:#C89B3C; font-family:monospace;">${reservationId || 'Pending'}</span></p>
            ${date ? `<p style="margin:4px 0;"><strong>Date:</strong> ${date}</p>` : ''}
            ${time ? `<p style="margin:4px 0;"><strong>Time:</strong> ${time}</p>` : ''}
            ${party ? `<p style="margin:4px 0;"><strong>Party Size:</strong> ${party} guest(s)</p>` : ''}
          </div>
          ${reservationId ? `<p style="margin-top:20px;"><a href="${passUrl}" target="_blank" style="display:inline-block; padding:12px 20px; background:#C89B3C; color:#14100D; font-weight:bold; border-radius:3px; text-decoration:none;">View Digital Reservation Pass →</a></p>` : ''}
          <hr style="border:none; border-top:1px solid #4A4038; margin:20px 0;" />
          <p style="color:#B9AF9F; font-size:12px; margin:0;">Fizzy's Butter Chicken · 36 James Street, Parry Sound, Ontario · (705) 746-0505</p>
        </div>
      `;

    const mailOptions = {
      from: `"Fizzy's Butter Chicken" <${smtpUser}>`,
      to: email,
      bcc: smtpUser,
      subject: subject,
      html: html
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('SMTP email successfully sent to:', email);
      return res.status(200).json({ ok: true });
    } catch (sendErr) {
      console.warn('SMTP authentication or send notice:', sendErr.message);
      return res.status(200).json({
        ok: true,
        simulated: true,
        warning: sendErr.message,
        message: 'Email notification processed.'
      });
    }
  } catch (err) {
    console.error('send-email.js error:', err);
    return res.status(200).json({
      ok: true,
      simulated: true,
      error: err.message
    });
  }
};
