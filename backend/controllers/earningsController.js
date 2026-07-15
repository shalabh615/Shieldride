const { EarningsRecord, Alert } = require('../models/models');
const ai = require('../services/aiService');

exports.logEarnings = async (req, res) => {
  try {
    const { date, totalEarnings, totalTrips, totalHours, perMileRate, platform } = req.body;
    const thirtyDaysAgo = new Date(Date.now() - 30*86400000);
    const history = await EarningsRecord.find({ driver: req.driver._id, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 });

    const anomaly = await ai.detectEarningsAnomaly(
      history.map(h => ({ date: h.date, earnings: h.totalEarnings, rate: h.perMileRate })),
      { totalEarnings, totalTrips, totalHours, perMileRate, date }
    );

    const record = await EarningsRecord.create({
      driver: req.driver._id, date: date || new Date(),
      totalEarnings, totalTrips, totalHours, perMileRate, platform,
      isAnomaly: anomaly.isAnomaly, anomalyType: anomaly.type,
      anomalyAmount: anomaly.estimatedMonthlyLoss, anomalyPercent: anomaly.percentDrop,
      aiAnalysis: anomaly.explanation,
    });

    if (anomaly.isAnomaly && anomaly.percentDrop >= parseInt(process.env.PAY_DROP_ALERT_PERCENT || 15)) {
      await Alert.create({
        driver: req.driver._id, type: 'wage_manipulation',
        severity: anomaly.percentDrop >= 30 ? 'danger' : 'warning',
        title: `Pay Dropped ${(anomaly.percentDrop||0).toFixed(1)}% — Anomaly Detected`,
        message: anomaly.explanation, aiReasoning: anomaly.explanation, confidence: anomaly.confidence,
      });
    }

    res.status(201).json({ record, anomalyAnalysis: anomaly });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getEarningsHistory = async (req, res) => {
  try {
    const since = new Date(Date.now() - parseInt(req.query.days||30)*86400000);
    const records = await EarningsRecord.find({ driver: req.driver._id, date: { $gte: since } }).sort({ date: -1 });
    res.json({ records });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getEarningsSummary = async (req, res) => {
  try {
    const id = req.driver._id;
    const [weekR, monthR] = await Promise.all([
      EarningsRecord.aggregate([{ $match: { driver: id, date: { $gte: new Date(Date.now()-7*86400000) } } }, { $group: { _id: null, total: { $sum: '$totalEarnings' }, avgRate: { $avg: '$perMileRate' }, trips: { $sum: '$totalTrips' } } }]),
      EarningsRecord.aggregate([{ $match: { driver: id, date: { $gte: new Date(Date.now()-30*86400000) } } }, { $group: { _id: null, total: { $sum: '$totalEarnings' }, avgRate: { $avg: '$perMileRate' }, trips: { $sum: '$totalTrips' } } }]),
    ]);
    const recentAnomalies = await EarningsRecord.find({ driver: id, isAnomaly: true, date: { $gte: new Date(Date.now()-7*86400000) } });
    const week  = weekR[0]  || { total: 0, avgRate: 0, trips: 0 };
    const month = monthR[0] || { total: 0, avgRate: 0, trips: 0 };
    res.json({ week, month, dailyAvg: month.total / 30, recentAnomalies });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
