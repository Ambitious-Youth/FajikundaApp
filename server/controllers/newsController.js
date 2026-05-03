const db = require('../config/db');
const slugify = require('slugify');

exports.getAll = async (req, res) => {
  const { category, limit = 20, offset = 0 } = req.query;
  try {
    let q = `SELECT n.id, n.title, n.slug, n.excerpt, n.cover_image, n.category,
               n.published_at, n.views, u.username, u.full_name
             FROM news n LEFT JOIN users u ON n.author_id = u.id
             WHERE n.is_published = 1`;
    const params = [];
    if (category) { q += ' AND n.category = ?'; params.push(category); }
    q += ' ORDER BY n.published_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, u.username, u.full_name, u.avatar_url
       FROM news n LEFT JOIN users u ON n.author_id = u.id
       WHERE n.slug = ? AND n.is_published = 1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await db.query('UPDATE news SET views = views + 1 WHERE id = ?', [rows[0].id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const { title, excerpt, content, cover_image, category, tags, is_published } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
  try {
    const [result] = await db.query(
      `INSERT INTO news (title, slug, excerpt, content, cover_image, author_id, category, tags, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt, content, cover_image, req.user.id, category || 'general',
       tags ? JSON.stringify(tags) : null, is_published || false,
       is_published ? new Date() : null]
    );
    res.status(201).json({ id: result.insertId, slug, message: 'Article created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
