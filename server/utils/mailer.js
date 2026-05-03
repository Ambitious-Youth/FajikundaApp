const nodemailer = require('nodemailer');

// ─── Transport ────────────────────────────────────────────────────────────────
// Supports Gmail, Outlook, or custom SMTP via .env variables
// Required .env vars:
//   MAIL_HOST     (for custom SMTP e.g. smtp.gmail.com)
//   MAIL_PORT     (usually 587)
//   MAIL_USER     (your email address)
//   MAIL_PASS     (your password or app password)
//   MAIL_FROM     (display name + address e.g. "Fajikunda Society <noreply@fajikunda.org>")
//   CLIENT_URL    (frontend URL e.g. http://localhost:5174)

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST || 'smtp.gmail.com',
  port:   Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const FROM = process.env.MAIL_FROM || `"Fajikunda Society" <${process.env.MAIL_USER}>`;
const CLIENT = process.env.CLIENT_URL || 'http://localhost:5174';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin:0; padding:0; background:#f5efe3; font-family:'DM Sans',Arial,sans-serif; color:#2d1f0e; }
  .wrap { max-width:580px; margin:2rem auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(26,18,9,0.1); }
  .header { background:#1a1209; padding:2rem; text-align:center; }
  .header h1 { margin:0; color:#e8b84b; font-size:1.4rem; font-family:Georgia,serif; }
  .header p  { margin:.4rem 0 0; color:rgba(245,239,227,0.6); font-size:.85rem; }
  .body { padding:2rem; }
  .body h2 { font-family:Georgia,serif; color:#1a1209; margin-top:0; }
  .body p  { line-height:1.7; color:#6b4f2e; }
  .btn { display:inline-block; background:#c8902a; color:#fff; padding:.75rem 1.75rem; border-radius:8px; text-decoration:none; font-weight:600; margin-top:1rem; }
  .footer { background:#f5efe3; padding:1.25rem; text-align:center; font-size:.78rem; color:#9b7a52; border-top:1px solid #ede3d0; }
  .badge { display:inline-block; padding:.2rem .6rem; border-radius:20px; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
  .badge.urgent { background:#fee2e2; color:#c1440e; }
  .badge.high   { background:#fef3c7; color:#92400e; }
  .badge.normal { background:#ede3d0; color:#6b4f2e; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🌍 Fajikunda Society</h1>
    <p>Connecting our community across the diaspora</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    You're receiving this because you're a member of Fajikunda Society.<br/>
    <a href="${CLIENT}" style="color:#c8902a;">Visit the community portal</a>
  </div>
</div>
</body>
</html>
`;

// ─── Email Functions ──────────────────────────────────────────────────────────

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${CLIENT}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your Fajikunda password',
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>We received a request to reset the password for your Fajikunda Society account.</p>
      <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" class="btn">Reset My Password</a>
      <p style="margin-top:1.5rem;font-size:.85rem;color:#9b7a52;">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    `),
  });
};

/**
 * Send announcement notification to all active members
 * @param {Object} announcement - { title, content, priority, full_name }
 * @param {Array}  recipients   - array of email strings
 */
const sendAnnouncementEmail = async (announcement, recipients) => {
  if (!recipients || recipients.length === 0) return;

  const priorityLabel = announcement.priority === 'urgent' ? '🚨 URGENT' :
                        announcement.priority === 'high'   ? '⚠️ Important' : '📢 New';

  // Send in batches of 50 to avoid rate limits
  const batchSize = 50;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await transporter.sendMail({
      from: FROM,
      bcc: batch, // BCC to protect member privacy
      subject: `${priorityLabel} Announcement: ${announcement.title}`,
      html: baseTemplate(`
        <div style="margin-bottom:1rem;">
          <span class="badge ${announcement.priority}">${announcement.priority.toUpperCase()}</span>
        </div>
        <h2>${announcement.title}</h2>
        <p>${announcement.content.replace(/\n/g, '<br/>')}</p>
        <p style="font-size:.85rem;color:#9b7a52;margin-top:1.5rem;">
          — ${announcement.full_name || 'Fajikunda Society'}
        </p>
        <a href="${CLIENT}/announcements" class="btn">View All Announcements</a>
      `),
    });
  }
};

/**
 * Send welcome email to new member
 */
const sendWelcomeEmail = async (email, name) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Welcome to Fajikunda Society! 🌍',
    html: baseTemplate(`
      <h2>Welcome, ${name}! 🎉</h2>
      <p>We're so glad you've joined the <strong>Fajikunda Society</strong> — a community built on culture, solidarity, and togetherness across the diaspora.</p>
      <p>Here's what you can do on the portal:</p>
      <ul style="color:#6b4f2e;line-height:2;">
        <li>📢 Read the latest community announcements</li>
        <li>📅 Browse and RSVP to upcoming events</li>
        <li>📰 Stay informed with community news</li>
        <li>🤝 Connect with fellow members</li>
        <li>💰 Contribute to community fundraising</li>
      </ul>
      <a href="${CLIENT}" class="btn">Visit the Community Portal</a>
      <p style="margin-top:1.5rem;font-size:.85rem;color:#9b7a52;">
        If you have any questions, reach out to the committee. We're here to help.
      </p>
    `),
  });
};

/**
 * Verify SMTP connection (call on server start)
 */
const verifyMailer = async () => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('⚠️  Mailer not configured — set MAIL_USER and MAIL_PASS in .env');
    return false;
  }
  try {
    await transporter.verify();
    console.log('✅ Mailer connected');
    return true;
  } catch (err) {
    console.log('⚠️  Mailer connection failed:', err.message);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendAnnouncementEmail,
  sendWelcomeEmail,
  verifyMailer,
};
