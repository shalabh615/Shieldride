const jwt    = require('jsonwebtoken');
const Driver = require('../models/Driver');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authorized — no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.driver = await Driver.findById(decoded.id).select('-password');
    if (!req.driver) return res.status(401).json({ error: 'Driver not found' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { protect };
