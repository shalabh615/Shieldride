const r = require('express').Router();
const c = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.get('/algorithm',     c.analyzeAlgorithm);
r.post('/fatigue',      c.assessFatigue);
r.post('/deactivation', c.checkDeactivation);
module.exports = r;
