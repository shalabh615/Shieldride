const ai     = require('../services/aiService');
const Driver = require('../models/Driver');
const { EarningsRecord } = require('../models/models');

exports.analyzeAlgorithm = async (req, res) => {
  try {
    const city = req.driver.city;
    const weekAgo = new Date(Date.now() - 7*86400000);
    const cityDrivers = await Driver.find({ city }).select('_id');
    const cityIds = cityDrivers.map(d => d._id);
    const cityData = await EarningsRecord.aggregate([
      { $match: { driver: { $in: cityIds }, date: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, avgEarnings: { $avg: '$totalEarnings' }, avgRate: { $avg: '$perMileRate' }, driversCount: { $sum: 1 }, anomalyCount: { $sum: { $cond: ['$isAnomaly', 1, 0] } } } }
    ]);
    const analysis = await ai.analyzeAlgorithmBehavior({ city, weeklyData: cityData });
    res.json({ analysis, city, driversAnalyzed: cityIds.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.assessFatigue = async (req, res) => {
  try {
    const result = await ai.assessFatigueRisk(req.body);
    res.json({ fatigue: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.checkDeactivation = async (req, res) => {
  try {
    const result = await ai.assessDeactivationRisk(req.body);
    res.json({ deactivation: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
