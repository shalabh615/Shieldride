const r = require('express').Router();
const c = require('../controllers/passengerController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.post('/check',  c.checkPassenger);
r.post('/report', c.reportPassenger);
module.exports = r;
