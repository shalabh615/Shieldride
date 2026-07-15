const { Alert } = require('../models/models');

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ driver: req.driver._id, dismissed: false }).sort({ createdAt: -1 }).limit(20);
    const unreadCount = await Alert.countDocuments({ driver: req.driver._id, read: false, dismissed: false });
    res.json({ alerts, unreadCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.dismissAlert = async (req, res) => {
  try {
    await Alert.findOneAndUpdate({ _id: req.params.id, driver: req.driver._id }, { dismissed: true, read: true });
    res.json({ message: 'Alert dismissed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await Alert.updateMany({ driver: req.driver._id }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
