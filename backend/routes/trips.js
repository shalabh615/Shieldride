const r = require('express').Router();
const c = require('../controllers/tripController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.post('/',          c.logTrip);
r.get('/',           c.getTrips);
r.get('/stats',      c.getTripStats);
r.put('/:id/cancel', c.cancelTrip);
module.exports = r;
