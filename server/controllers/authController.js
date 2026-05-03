const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/db');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/mailer');

const TABLE = 'users'; // ← single place to change if table name ever changes

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { username, email, password, name, full_name, location, invite_code } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  // 1. Validate invite code
  if (!invite_code)
    return res.status(403).json({ error: 'An invite code is required to register.' });

  try {
    const [codes] = await db.query(
      'SELECT id FROM invite_codes WHERE code = ? AND is_active = TRUE',
      [invite_code.trim().toUpperCase()]
    );
    if (!codes.length)
      return res.status(403).json({ error: 'Invalid or expired invite code.' });

    // 2. Check for existing email
    const [existing] = await db.query(
      `SELECT id FROM ${TABLE} WHERE email = ?`,
      [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ error: 'Email already in use' });

    // 3. Create account with status = 'pending'
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const displayName = name || full_name || null;
    const uname = (username || email.split('@')[0]).trim();

    await db.query(
      `INSERT INTO ${TABLE} (id, username, email, password, full_name, location, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, uname, email.toLowerCase().trim(), hash, displayName, location || null]
    );

    sendWelcomeEmail(email, displayName || uname).catch(err =>
      console.log('Welcome email failed:', err.message)
    );

    // 4. Don't issue a token — account needs admin approval first
    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username or email already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  try {
    const [rows] = await db.query(
      `SELECT * FROM ${TABLE} WHERE email = ? AND is_active = 1`,
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    // Generic message to prevent email enumeration
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    // Status checks
    if (user.status === 'pending')
      return res.status(403).json({ error: 'Your account is awaiting admin approval. Please check back later.' });

    if (user.status === 'suspended')
      return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });

    // Update login stats
    await db.query(
      `UPDATE ${TABLE} SET last_login = NOW(), login_count = login_count + 1 WHERE id = ?`,
      [user.id]
    );

    const token = signToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Me ────────────────────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, email, full_name, role, location, avatar_url, bio, status, created_at
       FROM ${TABLE} WHERE id = ?`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Update Profile ────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const { full_name, location, bio, avatar_url } = req.body;
  try {
    await db.query(
      `UPDATE ${TABLE} SET full_name=?, location=?, bio=?, avatar_url=? WHERE id=?`,
      [full_name || null, location || null, bio || null, avatar_url || null, req.user.id]
    );
    const [rows] = await db.query(
      `SELECT id, username, email, full_name, role, location, avatar_url, bio FROM ${TABLE} WHERE id=?`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ── Change Password ───────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Both current and new password required' });
  if (newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  try {
    const [rows] = await db.query(`SELECT password FROM ${TABLE} WHERE id=?`, [req.user.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE ${TABLE} SET password=? WHERE id=?`, [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  res.json({ message: 'If that email is registered you will receive a reset link.' });

  try {
    const [rows] = await db.query(
      `SELECT id, email, full_name, username FROM ${TABLE} WHERE email=? AND is_active=1`,
      [email.toLowerCase().trim()]
    );
    if (!rows[0]) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.query('UPDATE password_resets SET used=1 WHERE email=?', [email.toLowerCase().trim()]);
    await db.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase().trim(), token, expires]
    );

    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error('Forgot password error:', err.message);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ message: 'Token and password required' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  try {
    const [rows] = await db.query(
      'SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()',
      [token]
    );
    if (!rows[0])
      return res.status(400).json({ message: 'This link has expired or is invalid. Please request a new one.' });

    const hash = await bcrypt.hash(password, 10);
    await db.query(`UPDATE ${TABLE} SET password=? WHERE email=?`, [hash, rows[0].email]);
    await db.query('UPDATE password_resets SET used=1 WHERE token=?', [token]);

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid');
// const crypto = require('crypto');
// const db = require('../config/db');
// const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/mailer');

// const signToken = (user) =>
//   jwt.sign(
//     { id: user.id, username: user.username, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
//   );

// exports.register = async (req, res) => {
//   const { username, email, password, name, full_name, location } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ error: 'Email and password required' });
//   try {
//     const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
//     if (existing.length)
//       return res.status(409).json({ error: 'Email already in use' });

//     const id = uuidv4();
//     const hash = await bcrypt.hash(password, 10);
//     const displayName = name || full_name || null;
//     const uname = (username || email.split('@')[0]).trim();

//     await db.query(
//       `INSERT INTO users (id, username, email, password, full_name, location) VALUES (?, ?, ?, ?, ?, ?)`,
//       [id, uname, email.toLowerCase().trim(), hash, displayName, location || null]
//     );

//     sendWelcomeEmail(email, displayName || uname).catch(err =>
//       console.log('Welcome email failed:', err.message)
//     );

//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url FROM users WHERE id = ?', [id]
//     );
//     const token = signToken(rows[0]);
//     res.status(201).json({ token, user: rows[0] });
//   } catch (err) {
//     if (err.code === 'ER_DUP_ENTRY')
//       return res.status(409).json({ error: 'Username or email already taken' });
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.login = async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ error: 'Email and password required' });
//   try {
//     const [rows] = await db.query(
//       'SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase().trim()]
//     );
//     const user = rows[0];
//     if (!user || !(await bcrypt.compare(password, user.password)))
//       return res.status(401).json({ error: 'Invalid credentials' });
//     await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
//     const token = signToken(user);
//     const { password: _, ...safeUser } = user;
//     res.json({ token, user: safeUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.me = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url, bio, created_at FROM users WHERE id = ?',
//       [req.user.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: 'User not found' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.updateProfile = async (req, res) => {
//   const { full_name, location, bio, avatar_url } = req.body;
//   try {
//     await db.query(
//       'UPDATE users SET full_name=?, location=?, bio=?, avatar_url=? WHERE id=?',
//       [full_name || null, location || null, bio || null, avatar_url || null, req.user.id]
//     );
//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url, bio FROM users WHERE id=?',
//       [req.user.id]
//     );
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.changePassword = async (req, res) => {
//   const { currentPassword, newPassword } = req.body;
//   if (!currentPassword || !newPassword)
//     return res.status(400).json({ message: 'Both current and new password required' });
//   if (newPassword.length < 8)
//     return res.status(400).json({ message: 'New password must be at least 8 characters' });
//   try {
//     const [rows] = await db.query('SELECT password FROM users WHERE id=?', [req.user.id]);
//     if (!rows[0]) return res.status(404).json({ message: 'User not found' });
//     const valid = await bcrypt.compare(currentPassword, rows[0].password);
//     if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
//     const hash = await bcrypt.hash(newPassword, 10);
//     await db.query('UPDATE users SET password=? WHERE id=?', [hash, req.user.id]);
//     res.json({ message: 'Password updated successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.forgotPassword = async (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).json({ message: 'Email required' });

//   // Respond immediately to prevent email enumeration
//   res.json({ message: 'If that email is registered you will receive a reset link.' });

//   try {
//     const [rows] = await db.query(
//       'SELECT id, email, full_name, username FROM users WHERE email=? AND is_active=1',
//       [email.toLowerCase().trim()]
//     );
//     if (!rows[0]) return;

//     const token = crypto.randomBytes(32).toString('hex');
//     const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

//     await db.query('UPDATE password_resets SET used=1 WHERE email=?', [email.toLowerCase().trim()]);
//     await db.query(
//       'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
//       [email.toLowerCase().trim(), token, expires]
//     );

//     await sendPasswordResetEmail(email, token);
//   } catch (err) {
//     console.error('Forgot password error:', err.message);
//   }
// };

// exports.resetPassword = async (req, res) => {
//   const { token, password } = req.body;
//   if (!token || !password)
//     return res.status(400).json({ message: 'Token and password required' });
//   if (password.length < 8)
//     return res.status(400).json({ message: 'Password must be at least 8 characters' });
//   try {
//     const [rows] = await db.query(
//       'SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()',
//       [token]
//     );
//     if (!rows[0])
//       return res.status(400).json({ message: 'This link has expired or is invalid. Please request a new one.' });

//     const hash = await bcrypt.hash(password, 10);
//     await db.query('UPDATE users SET password=? WHERE email=?', [hash, rows[0].email]);
//     await db.query('UPDATE password_resets SET used=1 WHERE token=?', [token]);

//     res.json({ message: 'Password reset successfully. You can now sign in.' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid');
// const db = require('../config/db');
// const { sendWelcomeEmail } = require('../utils/mailer');

// const signToken = (user) =>
//   jwt.sign(
//     { id: user.id, username: user.username, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
//   );

// exports.register = async (req, res) => {
//   const { username, email, password, name, full_name, location } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ error: 'Email and password required' });
//   try {
//     const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
//     if (existing.length)
//       return res.status(409).json({ error: 'Email already in use' });

//     const id = uuidv4();
//     const hash = await bcrypt.hash(password, 10);
//     const displayName = name || full_name || null;
//     const uname = username || email.split('@')[0];

//     await db.query(
//       `INSERT INTO users (id, username, email, password, full_name, location)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [id, uname.trim(), email.toLowerCase().trim(), hash, displayName, location || null]
//     );

//     // Send welcome email (non-blocking)
//     sendWelcomeEmail(email, displayName || uname).catch(err =>
//       console.log('Welcome email failed:', err.message)
//     );

//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url FROM users WHERE id = ?',
//       [id]
//     );
//     const token = signToken(rows[0]);
//     res.status(201).json({ token, user: rows[0] });
//   } catch (err) {
//     if (err.code === 'ER_DUP_ENTRY')
//       return res.status(409).json({ error: 'Username or email already taken' });
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.login = async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ error: 'Email and password required' });
//   try {
//     const [rows] = await db.query(
//       'SELECT * FROM users WHERE email = ? AND is_active = 1',
//       [email.toLowerCase().trim()]
//     );
//     const user = rows[0];
//     if (!user || !(await bcrypt.compare(password, user.password)))
//       return res.status(401).json({ error: 'Invalid credentials' });
//     await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
//     const token = signToken(user);
//     const { password: _, ...safeUser } = user;
//     res.json({ token, user: safeUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.me = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url, bio, created_at FROM users WHERE id = ?',
//       [req.user.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: 'User not found' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.updateProfile = async (req, res) => {
//   const { full_name, location, bio, avatar_url } = req.body;
//   try {
//     await db.query(
//       'UPDATE users SET full_name=?, location=?, bio=?, avatar_url=? WHERE id=?',
//       [full_name || null, location || null, bio || null, avatar_url || null, req.user.id]
//     );
//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url, bio FROM users WHERE id=?',
//       [req.user.id]
//     );
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };



// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { v4: uuidv4 } = require('uuid');
// const db = require('../config/db');

// const signToken = (user) =>
//   jwt.sign(
//     { id: user.id, username: user.username, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
//   );

// // Add welcome email to register function
// // Replace the register function in your authController.js with this:

// const exportsregister = async (req, res, next) => {
//   try {
//     const { name, username, email, password, role } = req.body;
//     const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
//     if (existing.length)
//       return res.status(409).json({ message: "Email already in use" });

//     const hashed = await bcrypt.hash(password, 12);
//     const id = uuidv4();
//     await db.query(
//       "INSERT INTO users (id, username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)",
//       [id, username || email.split("@")[0], name, email, hashed, role || "user"]
//     );

//     // Send welcome email (non-blocking)
//     sendWelcomeEmail(email, name || username).catch(err =>
//       console.log('Welcome email failed:', err.message)
//     );

//     logger.info(`New user registered: ${email}`);
//     return res.status(201).json({ message: "User registered successfully" });
//   } catch (err) { next(err); }
// };

// // Also add this import at the top of authController.js:
// // const { sendWelcomeEmail } = require('../utils/mailer');

// // exports.register = async (req, res) => {
// //   const { username, email, password, full_name, location } = req.body;
// //   if (!username || !email || !password)
// //     return res.status(400).json({ error: 'Username, email and password required' });
// //   if (password.length < 6)
// //     return res.status(400).json({ error: 'Password must be at least 6 characters' });
// //   try {
// //     const id = uuidv4();
// //     const hash = await bcrypt.hash(password, 10);
// //     await db.query(
// //       `INSERT INTO users (id, username, email, password, full_name, location)
// //        VALUES (?, ?, ?, ?, ?, ?)`,
// //       [id, username.trim(), email.toLowerCase().trim(), hash, full_name || null, location || null]
// //     );
// //     const [rows] = await db.query(
// //       'SELECT id, username, email, full_name, role, location, avatar_url FROM users WHERE id = ?',
// //       [id]
// //     );
// //     const token = signToken(rows[0]);
// //     res.status(201).json({ token, user: rows[0] });
// //   } catch (err) {
// //     if (err.code === 'ER_DUP_ENTRY')
// //       return res.status(409).json({ error: 'Username or email already taken' });
// //     console.error(err);
// //     res.status(500).json({ error: 'Server error' });
// //   }
// // };

// exports.login = async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ error: 'Email and password required' });
//   try {
//     const [rows] = await db.query(
//       'SELECT * FROM users WHERE email = ? AND is_active = 1',
//       [email.toLowerCase().trim()]
//     );
//     const user = rows[0];
//     if (!user || !(await bcrypt.compare(password, user.password)))
//       return res.status(401).json({ error: 'Invalid credentials' });
//     await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
//     const token = signToken(user);
//     const { password: _, ...safeUser } = user;
//     res.json({ token, user: safeUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.me = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url, bio, created_at FROM users WHERE id = ?',
//       [req.user.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: 'User not found' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.updateProfile = async (req, res) => {
//   const { full_name, location, bio, avatar_url } = req.body;
//   try {
//     await db.query(
//       'UPDATE users SET full_name=?, location=?, bio=?, avatar_url=? WHERE id=?',
//       [full_name || null, location || null, bio || null, avatar_url || null, req.user.id]
//     );
//     const [rows] = await db.query(
//       'SELECT id, username, email, full_name, role, location, avatar_url, bio FROM users WHERE id=?',
//       [req.user.id]
//     );
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

