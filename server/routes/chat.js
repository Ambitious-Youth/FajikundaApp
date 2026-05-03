const router = require('express').Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/chat/rooms — list all accessible rooms
router.get('/rooms', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const [rooms] = await db.query(
      `SELECT * FROM chat_rooms WHERE type != 'admin' OR ? = TRUE ORDER BY created_at`,
      [isAdmin]
    );
    res.json(rooms);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/dms/:userId — get DM history with a user
router.get('/dms/:userId', auth, async (req, res) => {
  try {
    const [messages] = await db.query(`
      SELECT dm.*, 
             u.username, u.full_name, u.avatar_url
      FROM direct_messages dm
      JOIN users u ON u.id = dm.from_id
      WHERE (dm.from_id = ? AND dm.to_id = ?)
         OR (dm.from_id = ? AND dm.to_id = ?)
      ORDER BY dm.created_at ASC LIMIT 100
    `, [req.user.id, req.params.userId, req.params.userId, req.user.id]);

    // Mark as read
    await db.query(
      'UPDATE direct_messages SET is_read=TRUE WHERE from_id=? AND to_id=?',
      [req.params.userId, req.user.id]
    );

    res.json(messages);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chat/unread — count unread DMs
router.get('/unread', auth, async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM direct_messages WHERE to_id=? AND is_read=FALSE',
      [req.user.id]
    );
    res.json({ count });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
