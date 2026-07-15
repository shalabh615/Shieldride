const r = require('express').Router();
const c = require('../controllers/earningsController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.post('/',       c.logEarnings);
r.get('/',        c.getEarningsHistory);
r.get('/summary', c.getEarningsSummary);
module.exports = r;
