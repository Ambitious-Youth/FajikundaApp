const db = require('../config/db');
const { sendAnnouncementEmail } = require('../utils/mailer');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.username, u.full_name, u.avatar_url
       FROM announcements a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.is_published = 1
       ORDER BY a.is_pinned DESC, a.published_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.username, u.full_name FROM announcements a
       LEFT JOIN users u ON a.author_id = u.id WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const { title, content, priority, is_pinned, is_published } = req.body;
  if (!title || !content)
    return res.status(400).json({ error: 'Title and content required' });
  try {
    const published = is_published !== false && is_published !== 0;

    const [result] = await db.query(
      `INSERT INTO announcements (title, content, author_id, priority, is_pinned, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, content, req.user.id,
       priority || 'normal',
       is_pinned ? 1 : 0,
       published ? 1 : 0,
       published ? new Date() : null]
    );

    // Email all active members (non-blocking)
    if (published) {
      const [authorRows] = await db.query('SELECT full_name, username FROM users WHERE id=?', [req.user.id]);
      const author = authorRows[0];
      db.query('SELECT email FROM users WHERE is_active=1 AND email IS NOT NULL')
        .then(([members]) => {
          const emails = members.map(m => m.email).filter(Boolean);
          return sendAnnouncementEmail(
            { title, content, priority: priority || 'normal', full_name: author?.full_name || author?.username },
            emails
          );
        })
        .catch(err => console.log('Announcement email failed:', err.message));
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
      `UPDATE announcements
       SET title=?, content=?, priority=?, is_pinned=?, is_published=?,
           published_at = CASE WHEN is_published=0 AND ?=1 THEN NOW() ELSE published_at END
       WHERE id=?`,
      [title, content, priority, is_pinned ? 1 : 0, is_published ? 1 : 0, is_published ? 1 : 0, req.params.id]
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
// const { sendAnnouncementEmail } = require('../utils/mailer');

// exports.getAll = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT a.*, u.username, u.full_name, u.avatar_url
//        FROM announcements a
//        LEFT JOIN users u ON a.author_id = u.id
//        WHERE a.is_published = 1
//        ORDER BY a.is_pinned DESC, a.published_at DESC
//        LIMIT 50`
//     );
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.getOne = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT a.*, u.username, u.full_name FROM announcements a
//        LEFT JOIN users u ON a.author_id = u.id WHERE a.id = ?`,
//       [req.params.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: 'Not found' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.create = async (req, res) => {
//   const { title, content, priority, is_pinned, is_published } = req.body;
//   if (!title || !content)
//     return res.status(400).json({ error: 'Title and content required' });
//   try {
//     const published = is_published !== false && is_published !== 0;

//     const [result] = await db.query(
//       `INSERT INTO announcements (title, content, author_id, priority, is_pinned, is_published, published_at)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [title, content, req.user.id,
//        priority || 'normal',
//        is_pinned ? 1 : 0,
//        published ? 1 : 0,
//        published ? new Date() : null]
//     );

//     // Email all active members (non-blocking)
//     if (published) {
//       const [authorRows] = await db.query('SELECT full_name, username FROM users WHERE id=?', [req.user.id]);
//       const author = authorRows[0];
//       db.query('SELECT email FROM users WHERE is_active=1 AND email IS NOT NULL')
//         .then(([members]) => {
//           const emails = members.map(m => m.email).filter(Boolean);
//           return sendAnnouncementEmail(
//             { title, content, priority: priority || 'normal', full_name: author?.full_name || author?.username },
//             emails
//           );
//         })
//         .catch(err => console.log('Announcement email failed:', err.message));
//     }

//     res.status(201).json({ id: result.insertId, message: 'Announcement created' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.update = async (req, res) => {
//   const { title, content, priority, is_pinned, is_published } = req.body;
//   try {
//     await db.query(
//       `UPDATE announcements
//        SET title=?, content=?, priority=?, is_pinned=?, is_published=?,
//            published_at = CASE WHEN is_published=0 AND ?=1 THEN NOW() ELSE published_at END
//        WHERE id=?`,
//       [title, content, priority, is_pinned ? 1 : 0, is_published ? 1 : 0, is_published ? 1 : 0, req.params.id]
//     );
//     res.json({ message: 'Updated' });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.remove = async (req, res) => {
//   try {
//     await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };



// const db = require('../config/db');

// exports.getAll = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT a.*, u.username, u.full_name, u.avatar_url
//        FROM announcements a
//        LEFT JOIN users u ON a.author_id = u.id
//        WHERE a.is_published = 1
//        ORDER BY a.is_pinned DESC, a.published_at DESC
//        LIMIT 50`
//     );
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.getOne = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT a.*, u.username, u.full_name FROM announcements a
//        LEFT JOIN users u ON a.author_id = u.id WHERE a.id = ?`,
//       [req.params.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: 'Not found' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.create = async (req, res) => {
//   const { title, content, priority, is_pinned } = req.body;
//   if (!title || !content)
//     return res.status(400).json({ error: 'Title and content required' });
//   try {
//     const [result] = await db.query(
//       `INSERT INTO announcements (title, content, author_id, priority, is_pinned)
//        VALUES (?, ?, ?, ?, ?)`,
//       [title, content, req.user.id, priority || 'normal', is_pinned || false]
//     );
//     res.status(201).json({ id: result.insertId, message: 'Announcement created' });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.update = async (req, res) => {
//   const { title, content, priority, is_pinned, is_published } = req.body;
//   try {
//     await db.query(
//       `UPDATE announcements SET title=?, content=?, priority=?, is_pinned=?, is_published=?
//        WHERE id=?`,
//       [title, content, priority, is_pinned, is_published, req.params.id]
//     );
//     res.json({ message: 'Updated' });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// exports.remove = async (req, res) => {
//   try {
//     await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };
