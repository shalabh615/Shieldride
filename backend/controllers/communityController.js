const { Incident } = require('../models/models');
const Driver = require('../models/Driver');
const ai = require('../services/aiService');

exports.getCommunityReports = async (req, res) => {
  try {
    const city = req.query.city || req.driver.city;
    const weekAgo = new Date(Date.now() - 7*86400000);
    const reports = await Incident.find({ city, sharedToCommunity: true, createdAt: { $gte: weekAgo } })
      .select('type severity neighborhood createdAt aiSummary').limit(100);
    const summary = await ai.summarizeCommunityReports(reports, city);
    const driverCount = await Driver.countDocuments({ city });
    res.json({ summary, rawReports: reports, driverCount, city });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
