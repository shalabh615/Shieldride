const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  riderId:    { type: String },
  platform:   { type: String, enum: ['Uber','Lyft','Other'], default: 'Uber' },
  pickup:     { type: String },
  dropoff:    { type: String },
  fare:       { type: Number, default: 0 },
  tip:        { type: Number, default: 0 },
  startTime:  { type: Date },
  endTime:    { type: Date },
  duration:   { type: Number },
  distance:   { type: Number },
  riskScore:  { type: Number, default: 0 },
  riskLevel:  { type: String, enum: ['low','medium','high'], default: 'low' },
  status:     { type: String, enum: ['completed','cancelled','in_progress','cancelled_safety'], default: 'completed' },
  cancelReason:{ type: String },
  aiAnalysis: { type: String },
  notes:      { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
