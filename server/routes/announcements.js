const r = require('express').Router();
const c = require('../controllers/announcementsController');
const { auth, adminOnly } = require('../middleware/auth');
r.get('/',        auth, c.getAll);
r.get('/:id',     auth, c.getOne);
r.post('/',       auth, adminOnly, c.create);
r.put('/:id',     auth, adminOnly, c.update);
r.delete('/:id',  auth, adminOnly, c.remove);
module.exports = r;
