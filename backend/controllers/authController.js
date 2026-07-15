const jwt    = require('jsonwebtoken');
const Driver = require('../models/Driver');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password, city, platform, phone } = req.body;
    if (await Driver.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const driver = await Driver.create({ name, email, password, city, platform, phone });
    res.status(201).json({ token: genToken(driver._id), driver });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const driver = await Driver.findOne({ email });
    if (!driver || !(await driver.matchPassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ token: genToken(driver._id), driver });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getMe = (req, res) => res.json({ driver: req.driver });

exports.updateProfile = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.driver._id, req.body, { new: true });
    res.json({ driver });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
