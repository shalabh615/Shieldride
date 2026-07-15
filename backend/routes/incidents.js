const r = require('express').Router();
const c = require('../controllers/incidentController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.post('/',     c.reportIncident);
r.get('/',      c.getIncidents);
r.get('/stats', c.getIncidentStats);
module.exports = r;
