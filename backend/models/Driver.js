const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, minlength: 6 },
  driverId:   { type: String, unique: true },
  city:       { type: String, default: 'Chicago' },
  platform:   { type: String, enum: ['Uber','Lyft','Both','Other'], default: 'Both' },
  phone:      { type: String },
  safetyScore:    { type: Number, default: 100 },
  totalTrips:     { type: Number, default: 0 },
  totalEarnings:  { type: Number, default: 0 },
  shiftHours:     { type: Number, default: 0 },
  emergencyContacts: [{ name: String, phone: String }],
  earningsBaseline: {
    dailyAvg:    { type: Number, default: 0 },
    weeklyAvg:   { type: Number, default: 0 },
    perMileRate: { type: Number, default: 0 },
  },
}, { timestamps: true });

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.driverId) this.driverId = '#' + Math.floor(10000 + Math.random() * 90000);
  next();
});

driverSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

driverSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Driver', driverSchema);
