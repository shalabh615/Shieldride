const mongoose = require('mongoose');

// ── Alert ─────────────────────────────────────────────────────
const alertSchema = new mongoose.Schema({
  driver:      { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  type:        { type: String, enum: ['high_risk_rider','wage_manipulation','algorithm_change','fatigue','deactivation_risk','community_warning','surge_manipulation'], required: true },
  severity:    { type: String, enum: ['info','warning','danger'], default: 'warning' },
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  aiReasoning: { type: String },
  confidence:  { type: Number },
  riderId:     { type: String },
  dismissed:   { type: Boolean, default: false },
  read:        { type: Boolean, default: false },
}, { timestamps: true });

// ── Incident ──────────────────────────────────────────────────
const incidentSchema = new mongoose.Schema({
  driver:      { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  type:        { type: String, enum: ['verbal_harassment','physical_threat','physical_assault','property_damage','robbery','suspicious_behavior','wage_theft','wrongful_deactivation','other'], required: true },
  severity:    { type: String, enum: ['low','medium','high','critical'], required: true },
  description: { type: String, required: true },
  riderId:     { type: String },
  policeNotified:    { type: Boolean, default: false },
  platformReported:  { type: Boolean, default: false },
  platformResponse:  { type: String, enum: ['none','no_action','resolved','retaliated','pending'], default: 'none' },
  aiSummary:   { type: String },
  prevented:   { type: Boolean, default: false },
  sharedToCommunity: { type: Boolean, default: true },
  city:        { type: String },
  neighborhood:{ type: String },
  status:      { type: String, enum: ['open','investigating','resolved','closed'], default: 'open' },
}, { timestamps: true });

// ── Passenger (community risk database) ──────────────────────
// This is the core data model that feeds the AI scoring.
// Every field here is a signal Claude uses to compute risk.
const passengerSchema = new mongoose.Schema({
  platformRiderId: { type: String, required: true, unique: true },
  platform:        { type: String },

  // === SIGNAL 1: Account Age (30% weight) ===
  accountAgeDays:  { type: Number, default: 0 },
  // Under 7 days = very high risk (most problem riders create new accounts)
  // Under 30 days = elevated risk
  // Over 180 days = lower risk

  // === SIGNAL 2: Community Reports (30% weight) ===
  reportCount:    { type: Number, default: 0 },
  reportTypes:    [String],
  // Types: 'aggressive', 'refused_payment', 'suspicious', 'threatening',
  //        'property_damage', 'verbal_abuse', 'attempted_fraud'
  reportHistory: [{
    type:        String,
    description: String,
    reportedAt:  Date,
  }],

  // === SIGNAL 3: Payment Risk (25% weight) ===
  paymentFlags:   { type: Number, default: 0 },
  chargebacks:    { type: Number, default: 0 },
  // A chargeback = rider disputed a real charge with their bank
  // Even 1 chargeback is a strong fraud indicator
  // paymentFlags = platform-level flags (declined cards, unusual patterns)

  // === SIGNAL 4: Payment Type (10% weight) ===
  paymentType:    { type: String, default: 'unknown' },
  // 'credit' = lowest risk (trackable, reversible)
  // 'paypal' = medium risk
  // 'prepaid' = high risk (untraceable)
  // 'cash_app' = high risk

  // === AI OUTPUT ===
  riskScore:      { type: Number, default: 0, min: 0, max: 100 },
  riskLevel:      { type: String, enum: ['low','medium','high'], default: 'low' },
  riskFactors:    [{ factor: String, score: Number, weight: Number, detail: String }],
  aiNotes:        { type: String },

  // === GEOGRAPHY ===
  cities:         [String],
  flaggedInCities:[String],

  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

// ── EarningsRecord ────────────────────────────────────────────
const earningsSchema = new mongoose.Schema({
  driver:        { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  date:          { type: Date, required: true },
  totalEarnings: { type: Number, default: 0 },
  totalTrips:    { type: Number, default: 0 },
  totalHours:    { type: Number, default: 0 },
  perMileRate:   { type: Number, default: 0 },
  platform:      { type: String },
  isAnomaly:     { type: Boolean, default: false },
  anomalyType:   { type: String },
  anomalyAmount: { type: Number },
  anomalyPercent:{ type: Number },
  aiAnalysis:    { type: String },
}, { timestamps: true });

module.exports = {
  Alert:          mongoose.model('Alert', alertSchema),
  Incident:       mongoose.model('Incident', incidentSchema),
  Passenger:      mongoose.model('Passenger', passengerSchema),
  EarningsRecord: mongoose.model('EarningsRecord', earningsSchema),
};
