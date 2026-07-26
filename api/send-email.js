// POST /api/send-email
// Body: { type, name, email, record }
// Handles:
// 1. 'admin_notification': Sent to restaurant management (fizzybutterchicken@gmail.com, umarkhatabmalik2156@gmail.com, zakiulhassan105@gmail.com) with Admin Console login link.
// 2. 'user_approval' / 'confirmation': Sent to guest's email when admin approves the reservation, containing Digital Pass link.
// 3. 'checkin': Sent to guest when staff checks them in.

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
    const { type, name, email, record } = req.body || {};
    const recordData = record || {};

    const primaryRecipient = email || recordData.email;
    if (!primaryRecipient && type !== 'admin_notification') {
      return res.status(400).json({ error: 'Missing recipient email.' });
    }

    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials missing in Vercel. Email notification simulated for:', primaryRecipient || 'admin');
      return res.status(200).json({
        ok: true,
        simulated: true,
        message: 'SMTP credentials missing in Vercel env vars (GMAIL_USER / GMAIL_APP_PASS). Email simulated.'
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
        tls: { ciphers: 'SSLv3' }
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

    let subject = '';
    let html = '';
    let toField = primaryRecipient;
    let bccField = undefined;
    const reservationId = recordData.id || '';
    const passUrl = `https://fizzybutterchicken.vercel.app/card-viewer.html?id=${encodeURIComponent(reservationId)}`;
    const adminConsoleUrl = `https://fizzybutterchicken.vercel.app/admin.html`;

    if (type === 'admin_notification') {
      toField = primaryRecipient || 'fizzybutterchicken@gmail.com';
      // Include all admin notification emails so management gets instant alerts
      bccField = ['fizzybutterchicken@gmail.com', 'umarkhatabmalik2156@gmail.com', 'zakiulhassan105@gmail.com'];
      subject = `🔔 New Reservation Request — ${recordData.name || 'Guest'} (${recordData.guests || 1} Guests)`;
      html = `
        <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:560px; margin:0 auto; padding:24px; border:1px solid #C89B3C; background-color:#14100D; color:#EDE6DA; border-radius:6px;">
          <h2 style="color:#C89B3C; margin-top:0; font-weight:500;">🔔 New Table Reservation Request</h2>
          <p>A new guest has submitted a reservation request for <strong>Fizzy's Butter Chicken</strong>:</p>
          <div style="background:#1F1915; border:1px solid #4A4038; padding:18px; border-radius:4px; margin:18px 0; font-size:14px; line-height:1.6;">
            <p style="margin:4px 0;"><strong>Reservation ID:</strong> <span style="color:#C89B3C; font-family:monospace; font-size:15px;">${reservationId}</span></p>
            <p style="margin:4px 0;"><strong>Guest Name:</strong> ${recordData.name || '--'}</p>
            <p style="margin:4px 0;"><strong>Email:</strong> ${recordData.email || '--'}</p>
            <p style="margin:4px 0;"><strong>Phone:</strong> ${recordData.phone || '--'}</p>
            <p style="margin:4px 0;"><strong>Date:</strong> ${recordData.reservation_date || '--'}</p>
            <p style="margin:4px 0;"><strong>Time:</strong> ${recordData.reservation_time || '--'}</p>
            <p style="margin:4px 0;"><strong>Party Size:</strong> ${recordData.guests || 1} guest(s)</p>
            ${recordData.notes ? `<p style="margin:4px 0;"><strong>Special Notes:</strong> ${recordData.notes}</p>` : ''}
          </div>
          <p style="margin-top:24px;">
            <a href="${adminConsoleUrl}" target="_blank" style="display:inline-block; padding:14px 24px; background:#C89B3C; color:#14100D; font-weight:bold; border-radius:4px; text-decoration:none; text-transform:uppercase; letter-spacing:0.05em;">Open Admin Console to Approve →</a>
          </p>
          <hr style="border:none; border-top:1px solid #4A4038; margin:24px 0 16px;" />
          <p style="color:#B9AF9F; font-size:12px; margin:0;">Fizzy's Butter Chicken Admin Notification System</p>
        </div>
      `;
    } else if (type === 'checkin') {
      subject = `✓ You're checked in — Fizzy's Butter Chicken`;
      html = `
        <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:520px; margin:0 auto; padding:24px; border:1px solid #4A4038; background-color:#14100D; color:#EDE6DA; border-radius:6px;">
          <h2 style="color:#C89B3C; margin-top:0; font-weight:500;">Welcome in, ${name || recordData.name || 'guest'}!</h2>
          <p>You've been checked in at Fizzy's Butter Chicken. Your table is ready.</p>
          <p>Thank you for dining with us tonight!</p>
          <hr style="border:none; border-top:1px solid #4A4038; margin:20px 0;" />
          <p style="color:#B9AF9F; font-size:12px; margin:0;">Fizzy's Butter Chicken · 36 James Street, Parry Sound, Ontario</p>
        </div>
      `;
    } else {
      // Default: 'user_approval' / 'confirmation'
      bccField = ['fizzybutterchicken@gmail.com', 'umarkhatabmalik2156@gmail.com', 'zakiulhassan105@gmail.com'];
      subject = `🎉 Reservation Accepted — Fizzy's Butter Chicken`;
      html = `
        <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width:540px; margin:0 auto; padding:24px; border:1px solid #4A4038; background-color:#14100D; color:#EDE6DA; border-radius:6px;">
          <h2 style="color:#8fae6b; margin-top:0; font-weight:500;">🎉 Reservation Accepted!</h2>
          <p>Hello ${name || recordData.name || 'Guest'},</p>
          <p>Great news! Your reservation request at <strong>Fizzy's Butter Chicken</strong> has been officially accepted by our management team.</p>
          <div style="background:#1F1915; border:1px solid #4A4038; padding:18px; border-radius:4px; margin:18px 0;">
            <p style="margin:4px 0;"><strong>Reservation ID:</strong> <span style="color:#C89B3C; font-family:monospace; font-size:15px;">${reservationId || 'Confirmed'}</span></p>
            <p style="margin:4px 0;"><strong>Date:</strong> ${recordData.reservation_date || recordData.date || '--'}</p>
            <p style="margin:4px 0;"><strong>Time:</strong> ${recordData.reservation_time || recordData.time || '--'}</p>
            <p style="margin:4px 0;"><strong>Party Size:</strong> ${recordData.guests || recordData.party || 1} guest(s)</p>
          </div>
          ${reservationId ? `<p style="margin-top:20px;"><a href="${passUrl}" target="_blank" style="display:inline-block; padding:13px 22px; background:#C89B3C; color:#14100D; font-weight:bold; border-radius:4px; text-decoration:none;">View Digital Reservation Pass →</a></p>` : ''}
          <hr style="border:none; border-top:1px solid #4A4038; margin:24px 0 16px;" />
          <p style="color:#B9AF9F; font-size:12px; margin:0;">Fizzy's Butter Chicken · 36 James Street, Parry Sound, Ontario · (705) 746-0505</p>
        </div>
      `;
    }

    const mailOptions = {
      from: `"Fizzy's Butter Chicken" <${smtpUser}>`,
      to: toField,
      subject: subject,
      html: html
    };

    if (bccField) {
      mailOptions.bcc = bccField;
    }

    try {
      await transporter.sendMail(mailOptions);
      console.log('SMTP email successfully sent to:', toField);
      return res.status(200).json({ ok: true, recipient: toField });
    } catch (sendErr) {
      console.warn('SMTP send notice:', sendErr.message);
      return res.status(200).json({
        ok: true,
        simulated: true,
        warning: sendErr.message,
        message: 'Email processed.'
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
