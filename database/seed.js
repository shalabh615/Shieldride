// Run from project root: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const Driver   = require('./backend/models/Driver');
const Trip     = require('./backend/models/Trip');
const { Incident, Alert, Passenger, EarningsRecord } = require('./backend/models/models');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Promise.all([Driver.deleteMany({}), Trip.deleteMany({}), Incident.deleteMany({}), Alert.deleteMany({}), Passenger.deleteMany({}), EarningsRecord.deleteMany({})]);
  console.log('🗑  Cleared existing data');

  const driver = await Driver.create({
    name: 'Marcus Thompson', email: 'marcus@shieldride.demo', password: 'password123',
    city: 'Chicago', platform: 'Both', phone: '+13125550100',
    safetyScore: 84, totalTrips: 847, totalEarnings: 22840,
    earningsBaseline: { dailyAvg: 191, weeklyAvg: 799, perMileRate: 0.94 },
    emergencyContacts: [{ name: 'Sarah Thompson', phone: '+13125550101' }],
  });
  console.log(`👤 Driver: ${driver.name} (${driver.driverId})`);

  await Passenger.insertMany([
    { platformRiderId: '#39241', accountAgeDays: 3, reportCount: 4, reportTypes: ['aggressive','refused_payment'], riskScore: 91, riskLevel: 'high', paymentFlags: 3, chargebacks: 3, paymentType: 'prepaid', aiNotes: 'New account, multiple chargebacks, community-flagged.', riskFactors: [{ factor: 'Account Age', score: 95, weight: 0.3 }, { factor: 'Payment Flags', score: 88, weight: 0.25 }, { factor: 'Community Reports', score: 82, weight: 0.3 }] },
    { platformRiderId: '#18823', accountAgeDays: 182, reportCount: 1, reportTypes: ['aggressive'], riskScore: 42, riskLevel: 'medium', paymentFlags: 1 },
    { platformRiderId: '#55102', accountAgeDays: 730, reportCount: 0, riskScore: 8, riskLevel: 'low' },
  ]);
  console.log('👥 Passengers seeded');

  const earningsData = [];
  for (let i = 30; i >= 0; i--) {
    const isRecent = i <= 7;
    const base = 191 + (Math.random() * 60 - 30);
    earningsData.push({
      driver: driver._id, date: new Date(Date.now() - i * 86400000),
      totalEarnings: +((isRecent ? base * 0.77 : base)).toFixed(2),
      totalTrips: Math.floor(8 + Math.random() * 6),
      totalHours: +(4 + Math.random() * 4).toFixed(1),
      perMileRate: isRecent ? 0.71 : 0.94, platform: 'Uber',
      isAnomaly: isRecent, anomalyType: isRecent ? 'rate_drop' : null,
      anomalyPercent: isRecent ? 24.5 : 0,
      aiAnalysis: isRecent ? 'Rate dropped 24.5% vs 30-day baseline without notice.' : null,
    });
  }
  await EarningsRecord.insertMany(earningsData);
  console.log(`💰 ${earningsData.length} earnings records seeded`);

  await Trip.insertMany([
    { driver: driver._id, riderId: '#55102', platform: 'Uber',  pickup: 'Wicker Park',   dropoff: 'River North', fare: 18.40, tip: 3.00, riskScore: 8,  riskLevel: 'low',    status: 'completed',        startTime: new Date(Date.now()-5400000),  endTime: new Date(Date.now()-1800000) },
    { driver: driver._id, riderId: '#18230', platform: 'Lyft',  pickup: "O'Hare Airport",dropoff: 'Lincoln Park',fare: 41.20, tip: 5.00, riskScore: 12, riskLevel: 'low',    status: 'completed',        startTime: new Date(Date.now()-9000000),  endTime: new Date(Date.now()-5400000) },
    { driver: driver._id, riderId: '#39241', platform: 'Uber',  pickup: 'Loop',          dropoff: 'N/A',         fare: 0,     tip: 0,    riskScore: 91, riskLevel: 'high',   status: 'cancelled_safety', cancelReason: 'AI safety alert — high risk passenger', startTime: new Date(Date.now()-12600000) },
    { driver: driver._id, riderId: '#18823', platform: 'Uber',  pickup: 'Pilsen',        dropoff: 'Hyde Park',   fare: 22.80, tip: 2.00, riskScore: 42, riskLevel: 'medium', status: 'completed',        startTime: new Date(Date.now()-16200000), endTime: new Date(Date.now()-14400000) },
    { driver: driver._id, riderId: '#71100', platform: 'Lyft',  pickup: 'Loop',          dropoff: 'Evanston',    fare: 34.10, tip: 4.00, riskScore: 5,  riskLevel: 'low',    status: 'completed',        startTime: new Date(Date.now()-19800000), endTime: new Date(Date.now()-16200000) },
  ]);
  console.log('🚗 Trips seeded');

  await Alert.insertMany([
    { driver: driver._id, type: 'high_risk_rider', severity: 'danger', title: 'High-Risk Rider Assigned', message: 'Account #39241 flagged by 4 drivers for aggressive behavior and refusal to pay.', aiReasoning: 'Account 72h old. Prepaid card. 3 chargebacks. Matches fraud pattern.', confidence: 91, riderId: '#39241', read: false },
    { driver: driver._id, type: 'wage_manipulation', severity: 'warning', title: 'Pay Dropped 24.5% This Week', message: 'Per-mile rate dropped $0.94→$0.71 without notice. 38 Chicago drivers affected.', aiReasoning: 'Systematic rate cut detected across 312 Chicago drivers on same date.', confidence: 78, read: false },
    { driver: driver._id, type: 'fatigue', severity: 'info', title: 'Fatigue Warning — 4h 22m on Shift', message: 'Accident risk +38% after 6h. Recommend 30-min break within 1.5 hours.', confidence: 90, read: false },
  ]);
  console.log('🔔 Alerts seeded');

  await Incident.insertMany([
    { driver: driver._id, type: 'suspicious_behavior', severity: 'high', description: 'Rider became verbally aggressive when asked to wear seatbelt.', platformReported: true, platformResponse: 'no_action', prevented: true, city: 'Chicago', neighborhood: 'River North', status: 'closed', createdAt: new Date(Date.now()-4*86400000) },
    { driver: driver._id, type: 'verbal_harassment',   severity: 'medium', description: 'Passenger made threatening comments throughout ride.', platformReported: true, platformResponse: 'no_action', city: 'Chicago', neighborhood: 'Wicker Park', status: 'closed', createdAt: new Date(Date.now()-10*86400000) },
    { driver: driver._id, type: 'wage_theft', severity: 'medium', description: 'Platform deducted $4.20 tip after ride was completed.', platformReported: true, platformResponse: 'pending', city: 'Chicago', status: 'open', createdAt: new Date(Date.now()-2*86400000) },
  ]);
  console.log('🛡  Incidents seeded');

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  ✅  Seed complete!                       ║');
  console.log('║  📧  marcus@shieldride.demo               ║');
  console.log('║  🔑  password123                          ║');
  console.log('╚══════════════════════════════════════════╝\n');
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
