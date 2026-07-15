const Trip    = require('../models/Trip');
const Driver  = require('../models/Driver');
const { Passenger, Alert, EarningsRecord } = require('../models/models');
const ai      = require('../services/aiService');

exports.logTrip = async (req, res) => {
  try {
    const { riderId, platform, pickup, dropoff, fare, tip, startTime, endTime, duration, distance, notes } = req.body;

    // AI passenger risk check
    let risk = { score: 0, level: 'low', reasoning: '', recommendation: 'proceed', confidence: 0 };
    if (riderId) {
      const passenger = await Passenger.findOne({ platformRiderId: riderId });
      risk = await ai.analyzePassengerRisk(passenger || { platformRiderId: riderId, accountAgeDays: req.body.accountAgeDays || 0, reportCount: 0, paymentFlags: 0 });
      // Update passenger record
      await Passenger.findOneAndUpdate(
        { platformRiderId: riderId },
        { riskScore: risk.score, riskLevel: risk.level, riskFactors: risk.factors || [], aiNotes: risk.reasoning, lastUpdated: Date.now() },
        { upsert: true, new: true }
      );
    }

    const trip = await Trip.create({
      driver: req.driver._id, riderId, platform, pickup, dropoff,
      fare, tip, startTime, endTime, duration, distance, notes,
      riskScore: risk.score, riskLevel: risk.level, aiAnalysis: risk.reasoning, status: 'completed',
    });

    await Driver.findByIdAndUpdate(req.driver._id, { $inc: { totalTrips: 1, totalEarnings: fare || 0 } });

    // Auto-alert if high risk
    if (risk.score >= parseInt(process.env.RISK_SCORE_HIGH || 70)) {
      await Alert.create({
        driver: req.driver._id, type: 'high_risk_rider', severity: 'danger',
        title: `High-Risk Rider — Score ${risk.score}/100`,
        message: risk.reasoning, aiReasoning: risk.reasoning, confidence: risk.confidence, riderId,
      });
    }

    res.status(201).json({ trip, riskAssessment: risk });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTrips = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const trips = await Trip.find({ driver: req.driver._id })
      .sort({ createdAt: -1 }).limit(+limit).skip((+page - 1) * +limit);
    const total = await Trip.countDocuments({ driver: req.driver._id });
    res.json({ trips, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, driver: req.driver._id },
      { status: 'cancelled_safety', cancelReason: req.body.reason || 'Safety concern' },
      { new: true }
    );
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json({ message: 'Trip cancelled. Acceptance rate protected.', trip });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTripStats = async (req, res) => {
  try {
    const id = req.driver._id;
    const today   = new Date(); today.setHours(0,0,0,0);
    const weekAgo = new Date(Date.now() - 7*86400000);
    const [[todayR], [weekR], prevented] = await Promise.all([
      Trip.aggregate([{ $match: { driver: id, createdAt: { $gte: today } } }, { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: '$fare' } } }]),
      Trip.aggregate([{ $match: { driver: id, createdAt: { $gte: weekAgo } } }, { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: '$fare' } } }]),
      Trip.countDocuments({ driver: id, status: 'cancelled_safety', createdAt: { $gte: weekAgo } }),
    ]);
    res.json({ today: todayR || { count: 0, earnings: 0 }, week: weekR || { count: 0, earnings: 0 }, prevented, shiftHours: req.driver.shiftHours || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
