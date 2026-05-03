const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
         u.username AS organizer_username, u.full_name AS organizer_name,
         COUNT(r.id) AS rsvp_count
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.id
       LEFT JOIN event_rsvps r ON e.id = r.event_id AND r.status = 'going'
       WHERE e.is_published = 1
       GROUP BY e.id
       ORDER BY e.start_date ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, u.username AS organizer_username, u.full_name AS organizer_name,
         COUNT(r.id) AS rsvp_count
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.id
       LEFT JOIN event_rsvps r ON e.id = r.event_id AND r.status='going'
       WHERE e.id = ?
       GROUP BY e.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const { title, description, location, is_virtual, meeting_url, start_date, end_date, max_rsvp } = req.body;
  if (!title || !start_date)
    return res.status(400).json({ error: 'Title and start date required' });
  try {
    const [result] = await db.query(
      `INSERT INTO events (title, description, location, is_virtual, meeting_url, start_date, end_date, organizer_id, max_rsvp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, location, is_virtual || false, meeting_url, start_date, end_date, req.user.id, max_rsvp || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Event created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  const { title, description, location, is_virtual, meeting_url, start_date, end_date, max_rsvp, is_published } = req.body;
  try {
    await db.query(
      `UPDATE events SET title=?, description=?, location=?, is_virtual=?, meeting_url=?,
       start_date=?, end_date=?, max_rsvp=?, is_published=? WHERE id=?`,
      [title, description, location, is_virtual, meeting_url, start_date, end_date, max_rsvp, is_published, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.rsvp = async (req, res) => {
  const { status } = req.body;
  try {
    await db.query(
      `INSERT INTO event_rsvps (event_id, user_id, status) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = ?`,
      [req.params.id, req.user.id, status || 'going', status || 'going']
    );
    res.json({ message: 'RSVP saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
