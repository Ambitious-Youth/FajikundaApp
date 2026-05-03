// routes/auth.js
const { sendPasswordResetEmail } = require('../utils/mailer');
const r = require('express').Router();
const c = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

r.post('/register', c.register);
r.post('/login', c.login);
r.get('/me', auth, c.me);
r.put('/profile', auth, c.updateProfile);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password',  c.resetPassword);
r.post('/change-password', auth, c.changePassword);

// Add this require at the top of routes/auth.js:
// const { sendPasswordResetEmail } = require('../utils/mailer');
// const crypto = require('crypto');

// POST /api/auth/forgot-password
r.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Always respond 200 to prevent email enumeration
  res.json({ message: 'If that email is registered you will receive a reset link shortly.' });
  try {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ? AND is_active = 1', [email?.toLowerCase().trim()]);
    if (!rows.length) return;
    const token = uuidv4() + uuidv4(); // 72 char token
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.query('DELETE FROM password_resets WHERE email = ?', [email]);
    await db.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase().trim(), token, expires]
    );
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.log('Password reset error:', err.message);
  }
});

// POST /api/auth/reset-password
r.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ message: 'Token and password required' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  try {
    const [rows] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    );
    if (!rows.length)
      return res.status(400).json({ message: 'This link is invalid or has expired.' });
    const { email } = rows[0];
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
    await db.query('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// // PATCH /api/auth/me — update own profile
// router.patch('/me', authenticate, async (req, res) => {
//   const { full_name, bio, location, avatar_url } = req.body;
//   try {
//     await db.query(
//       'UPDATE users SET full_name=?, bio=?, location=?, avatar_url=? WHERE id=?',
//       [full_name || null, bio || null, location || null, avatar_url || null, req.user.id]
//     );
//     const [rows] = await db.query(
//       'SELECT id, username, full_name, email, role, location, bio, avatar_url FROM users WHERE id=?',
//       [req.user.id]
//     );
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });
module.exports = r;
