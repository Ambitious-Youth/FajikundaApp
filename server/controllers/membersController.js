const db = require('../config/db');
const { sendAnnouncementEmail } = require('../utils/mailer');


exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, full_name, role, location, avatar_url, bio, created_at
       FROM users
       WHERE is_active = 1
       ORDER BY role = 'admin' DESC, full_name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, full_name, role, location, avatar_url, bio, created_at
       FROM users WHERE id = ? AND is_active = 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


exports.create = async (req, res) => {
  const { title, content, priority, is_pinned, is_published, notify_members } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: 'Title and content required' });
  try {
    // Get author info
    const [authorRows] = await db.query('SELECT full_name, username FROM users WHERE id=?', [req.user.id]);
    const author = authorRows[0];

    const [result] = await db.query(
      `INSERT INTO announcements (title, content, author_id, priority, is_pinned, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, content, req.user.id, priority || 'normal', is_pinned || false,
       is_published !== false, is_published !== false ? new Date() : null]
    );

    // Send email notifications if published and requested
    if (is_published !== false && notify_members !== false) {
      // Fire and forget — don't block the response
      db.query('SELECT email FROM users WHERE is_active=1 AND email IS NOT NULL')
        .then(([members]) => {
          const emails = members.map(m => m.email).filter(Boolean);
          return sendAnnouncementEmail(
            { title, content, priority: priority || 'normal', full_name: author?.full_name || author?.username },
            emails
          );
        })
        .catch(err => console.log('Email notification failed:', err.message));
    }

    res.status(201).json({ id: result.insertId, message: 'Announcement created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  const { title, content, priority, is_pinned, is_published } = req.body;
  try {
    await db.query(
      `UPDATE announcements SET title=?, content=?, priority=?, is_pinned=?, is_published=?,
       published_at = CASE WHEN is_published=0 AND ?=1 THEN NOW() ELSE published_at END
       WHERE id=?`,
      [title, content, priority, is_pinned, is_published, is_published, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};



// const db = require('../config/db');

// exports.getAll = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT id, username, full_name, location, avatar_url, bio, created_at
//        FROM users WHERE is_active = 1 ORDER BY full_name ASC`
//     );
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.getOne = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT id, username, full_name, location, avatar_url, bio, created_at
//        FROM users WHERE id = ? AND is_active = 1`,
//       [req.params.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: 'Member not found' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };
