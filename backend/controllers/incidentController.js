const { Incident } = require('../models/models');
const ai = require('../services/aiService');

exports.reportIncident = async (req, res) => {
  try {
    const { type, severity, description, riderId, policeNotified, platformReported, platformResponse } = req.body;
    const history = await Incident.find({ driver: req.driver._id, createdAt: { $gte: new Date(Date.now()-30*86400000) } }).select('type severity createdAt');
    const guidance = await ai.analyzeIncident({ type, severity, description, riderId }, history);

    const incident = await Incident.create({
      driver: req.driver._id, type, severity, description, riderId,
      policeNotified, platformReported, platformResponse,
      aiSummary: guidance.communityMessage || guidance.reportingAdvice,
      city: req.driver.city,
    });
    res.status(201).json({ incident, guidance });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ driver: req.driver._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ incidents });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getIncidentStats = async (req, res) => {
  try {
    const prevented = await Incident.countDocuments({ driver: req.driver._id, prevented: true });
    const stats = await Incident.aggregate([{ $match: { driver: req.driver._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ stats, prevented });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
