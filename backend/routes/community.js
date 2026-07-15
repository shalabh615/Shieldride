const r = require('express').Router();
const c = require('../controllers/communityController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.get('/', c.getCommunityReports);
module.exports = r;
