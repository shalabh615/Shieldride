const r = require('express').Router();
const c = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.get('/',            c.getAlerts);
r.put('/read-all',    c.markAllRead);
r.put('/:id/dismiss', c.dismissAlert);
module.exports = r;
