const db = require('../config/db');
const { auth, optionalAuth, adminOnly } = require('../middleware/auth');

// ─── News ─────────────────────────────────────────────────────────────────────
const r1 = require('express').Router();
const nc = require('../controllers/newsController');

r1.get('/', optionalAuth, nc.getAll);        // public
r1.get('/:slug', optionalAuth, nc.getOne);        // public
r1.post('/',      auth, adminOnly, nc.create);
r1.delete('/:id', auth, adminOnly, nc.remove);

module.exports.newsRouter = r1;

// ─── Members ──────────────────────────────────────────────────────────────────
const r2 = require('express').Router();
const mc = require('../controllers/membersController');

r2.get('/',    auth, mc.getAll);     // members only
r2.get('/:id', auth, mc.getOne);

r2.patch('/:id/role', auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin', 'member'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  try {
    await db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

r2.patch('/:id/active', auth, adminOnly, async (req, res) => {
  const { is_active } = req.body;
  try {
    await db.query('UPDATE users SET is_active=? WHERE id=?', [is_active ? 1 : 0, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports.membersRouter = r2;

// ─── Donations ────────────────────────────────────────────────────────────────
const r3 = require('express').Router();
const dc = require('../controllers/donationsController');

r3.get('/', optionalAuth, dc.getAll);
r3.post('/', optionalAuth, dc.create);

r3.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM donations WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports.donationsRouter = r3;



// const db = require('../config/db');
// const { auth, optionalAuth, adminOnly } = require('../middleware/auth');

// // ─── News ─────────────────────────────────────────────────────────────────────
// const r1 = require('express').Router();
// const nc = require('../controllers/newsController');

// r1.get('/',       auth, nc.getAll);
// r1.get('/:slug',  auth, nc.getOne);
// r1.post('/',      auth, adminOnly, nc.create);
// r1.delete('/:id', auth, adminOnly, nc.remove);

// module.exports.newsRouter = r1;

// // ─── Members ──────────────────────────────────────────────────────────────────
// const r2 = require('express').Router();
// const mc = require('../controllers/membersController');

// r2.get('/',    auth, mc.getAll);
// r2.get('/:id', auth, mc.getOne);

// r2.patch('/:id/role', auth, adminOnly, async (req, res) => {
//   const { role } = req.body;
//   if (!['user', 'admin', 'member'].includes(role))
//     return res.status(400).json({ error: 'Invalid role' });
//   try {
//     await db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
//     res.json({ message: 'Role updated' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// r2.patch('/:id/active', auth, adminOnly, async (req, res) => {
//   const { is_active } = req.body;
//   try {
//     await db.query('UPDATE users SET is_active=? WHERE id=?', [is_active ? 1 : 0, req.params.id]);
//     res.json({ message: 'Status updated' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// module.exports.membersRouter = r2;

// // ─── Donations ────────────────────────────────────────────────────────────────
// const r3 = require('express').Router();
// const dc = require('../controllers/donationsController');

// r3.get('/', optionalAuth, dc.getAll);
// r3.post('/', optionalAuth, dc.create);

// r3.delete('/:id', auth, adminOnly, async (req, res) => {
//   try {
//     await db.query('DELETE FROM donations WHERE id=?', [req.params.id]);
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// module.exports.donationsRouter = r3;


