const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.amount, d.currency, d.purpose, d.message, d.created_at,
         IF(d.is_anonymous, 'Anonymous', COALESCE(d.donor_name, u.full_name, u.username)) AS donor_display
       FROM donations d
       LEFT JOIN users u ON d.donor_id = u.id
       ORDER BY d.created_at DESC LIMIT 100`
    );
    const [totals] = await db.query(
      `SELECT SUM(amount) AS total, COUNT(*) AS count FROM donations`
    );
    res.json({ donations: rows, stats: totals[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const { amount, currency, purpose, message, is_anonymous, donor_name } = req.body;
  if (!amount || isNaN(amount) || amount <= 0)
    return res.status(400).json({ error: 'Valid amount required' });
  try {
    const [result] = await db.query(
      `INSERT INTO donations (donor_id, donor_name, amount, currency, purpose, message, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user?.id || null, donor_name || null, amount, currency || 'USD',
       purpose || null, message || null, is_anonymous || false]
    );
    res.status(201).json({ id: result.insertId, message: 'Donation recorded. Thank you!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
