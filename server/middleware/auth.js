const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Like auth but doesn't block — just attaches user if token present
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {}
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'moderator')
    return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { auth, optionalAuth, adminOnly };



// const jwt = require('jsonwebtoken');

// const auth = (req, res, next) => {
//   const header = req.headers.authorization;
//   if (!header?.startsWith('Bearer '))
//     return res.status(401).json({ error: 'No token provided' });
//   try {
//     req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
//     next();
//   } catch {
//     res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

// const adminOnly = (req, res, next) => {
//   if (req.user?.role !== 'admin' && req.user?.role !== 'moderator')
//     return res.status(403).json({ error: 'Admin access required' });
//   next();
// };

// module.exports = { auth, adminOnly };
