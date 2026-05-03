const router = require('express').Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(auth, adminOnly);

router.get('/members', async (req, res) => {
  try {
      const [rows] = await db.query(`
            SELECT id, username, email, full_name, role, status,
                         is_active, last_login, login_count, created_at
                               FROM users
                                     ORDER BY FIELD(status, 'pending', 'approved', 'suspended'), created_at DESC
                                         `);
                                             res.json(rows);
                                               } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                               });

                                               router.patch('/members/:id/status', async (req, res) => {
                                                 const { status } = req.body;
                                                   if (!['approved', 'suspended', 'pending'].includes(status))
                                                       return res.status(400).json({ error: 'Invalid status' });
                                                         if (req.params.id === req.user.id)
                                                             return res.status(400).json({ error: 'You cannot change your own status.' });
                                                               try {
                                                                   const [result] = await db.query('UPDATE users SET status=? WHERE id=?', [status, req.params.id]);
                                                                       if (!result.affectedRows) return res.status(404).json({ error: 'Member not found' });
                                                                           res.json({ message: `Member status updated to '${status}'` });
                                                                             } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                             });

                                                                             router.patch('/members/:id/role', async (req, res) => {
                                                                               const { role } = req.body;
                                                                                 if (!['member', 'admin', 'moderator', 'user'].includes(role))
                                                                                     return res.status(400).json({ error: 'Invalid role' });
                                                                                       if (req.params.id === req.user.id)
                                                                                           return res.status(400).json({ error: 'You cannot change your own role.' });
                                                                                             try {
                                                                                                 const [result] = await db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
                                                                                                     if (!result.affectedRows) return res.status(404).json({ error: 'Member not found' });
                                                                                                         res.json({ message: `Member role updated to '${role}'` });
                                                                                                           } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                                                           });

                                                                                                           router.delete('/members/:id', async (req, res) => {
                                                                                                             if (req.params.id === req.user.id)
                                                                                                                 return res.status(400).json({ error: 'You cannot delete your own account.' });
                                                                                                                   try {
                                                                                                                       const [result] = await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
                                                                                                                           if (!result.affectedRows) return res.status(404).json({ error: 'Member not found' });
                                                                                                                               res.json({ message: 'Member permanently deleted' });
                                                                                                                                 } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                                                                                 });

                                                                                                                                 router.get('/invite-codes', async (req, res) => {
                                                                                                                                   try {
                                                                                                                                       const [rows] = await db.query(`
                                                                                                                                             SELECT ic.*, m.username AS created_by_username
                                                                                                                                                   FROM invite_codes ic
                                                                                                                                                         LEFT JOIN members m ON m.id = ic.created_by
                                                                                                                                                               ORDER BY ic.created_at DESC
                                                                                                                                                                   `);
                                                                                                                                                                       res.json(rows);
                                                                                                                                                                         } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                                                                                                                         });

                                                                                                                                                                         router.post('/invite-codes', async (req, res) => {
                                                                                                                                                                           const { code } = req.body;
                                                                                                                                                                             if (!code || code.trim().length < 4)
                                                                                                                                                                                 return res.status(400).json({ error: 'Code must be at least 4 characters' });
                                                                                                                                                                                   try {
                                                                                                                                                                                       const id = uuidv4();
                                                                                                                                                                                           await db.query('INSERT INTO invite_codes (id, code, created_by) VALUES (?, ?, ?)',
                                                                                                                                                                                                 [id, code.trim().toUpperCase(), req.user.id]);
                                                                                                                                                                                                     res.status(201).json({ message: 'Invite code created', code: code.trim().toUpperCase() });
                                                                                                                                                                                                       } catch (err) {
                                                                                                                                                                                                           if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That code already exists' });
                                                                                                                                                                                                               console.error(err); res.status(500).json({ error: 'Server error' });
                                                                                                                                                                                                                 }
                                                                                                                                                                                                                 });

                                                                                                                                                                                                                 router.patch('/invite-codes/:id/toggle', async (req, res) => {
                                                                                                                                                                                                                   try {
                                                                                                                                                                                                                       const [rows] = await db.query('SELECT is_active FROM invite_codes WHERE id=?', [req.params.id]);
                                                                                                                                                                                                                           if (!rows[0]) return res.status(404).json({ error: 'Code not found' });
                                                                                                                                                                                                                               const newState = !rows[0].is_active;
                                                                                                                                                                                                                                   await db.query('UPDATE invite_codes SET is_active=? WHERE id=?', [newState, req.params.id]);
                                                                                                                                                                                                                                       res.json({ message: `Code ${newState ? 'activated' : 'deactivated'}`, is_active: newState });
                                                                                                                                                                                                                                         } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                                                                                                                                                                                         });

                                                                                                                                                                                                                                         router.delete('/invite-codes/:id', async (req, res) => {
                                                                                                                                                                                                                                           try {
                                                                                                                                                                                                                                               const [result] = await db.query('DELETE FROM invite_codes WHERE id=?', [req.params.id]);
                                                                                                                                                                                                                                                   if (!result.affectedRows) return res.status(404).json({ error: 'Code not found' });
                                                                                                                                                                                                                                                       res.json({ message: 'Invite code deleted' });
                                                                                                                                                                                                                                                         } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                                                                                                                                                                                                         });

                                                                                                                                                                                                                                                         router.get('/stats', async (req, res) => {
                                                                                                                                                                                                                                                           try {
                                                                                                                                                                                                                                                               const [[{ total }]]       = await db.query('SELECT COUNT(*) AS total FROM users');
                                                                                                                                                                                                                                                                   const [[{ pending }]]     = await db.query("SELECT COUNT(*) AS pending FROM users WHERE status='pending'");
                                                                                                                                                                                                                                                                       const [[{ approved }]]    = await db.query("SELECT COUNT(*) AS approved FROM users WHERE status='approved'");
                                                                                                                                                                                                                                                                           const [[{ suspended }]]   = await db.query("SELECT COUNT(*) AS suspended FROM users WHERE status='suspended'");
                                                                                                                                                                                                                                                                               const [[{ active_codes }]]= await db.query('SELECT COUNT(*) AS active_codes FROM invite_codes WHERE is_active=1');
                                                                                                                                                                                                                                                                                   res.json({ total, pending, approved, suspended, active_codes });
                                                                                                                                                                                                                                                                                     } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
                                                                                                                                                                                                                                                                                     });

                                                                                                                                                                                                                                                                                     module.exports = router;