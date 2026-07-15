const { Passenger } = require('../models/models');
const ai = require('../services/aiService');

// POST /api/passengers/check
// This is the main AI risk check — accepts ALL signal data from the frontend
exports.checkPassenger = async (req, res) => {
  try {
    const {
      riderId,
      accountAgeDays,   // How old is the rider account? (key signal)
      paymentType,      // credit | prepaid | paypal | cash_app | unknown
      paymentFlags,     // # of payment anomaly flags on their account
      chargebacks,      // # of disputed charges (strong fraud signal)
      reportCount,      // # of community driver reports
      reportTypes,      // array: ['aggressive','refused_payment','suspicious',...]
      pickup,           // pickup location (context modifier)
      timeOfDay,        // daytime | evening | late_night
    } = req.body;

    if (!riderId) return res.status(400).json({ error: 'riderId is required' });

    // Pull any existing community data from DB
    const existing = await Passenger.findOne({ platformRiderId: riderId });

    // Merge: request data takes priority, fall back to DB data
    const passengerData = {
      platformRiderId: riderId,
      accountAgeDays:  accountAgeDays  ?? existing?.accountAgeDays  ?? 0,
      paymentType:     paymentType     || existing?.paymentType     || 'unknown',
      paymentFlags:    paymentFlags    ?? existing?.paymentFlags    ?? 0,
      chargebacks:     chargebacks     ?? existing?.chargebacks     ?? 0,
      reportCount:     reportCount     ?? existing?.reportCount     ?? 0,
      reportTypes:     reportTypes     || existing?.reportTypes     || [],
      pickup:          pickup          || 'not specified',
      timeOfDay:       timeOfDay       || 'daytime',
      // Historical context from DB
      previousRidesKnown: existing ? true : false,
      citiesFlagged:   existing?.flaggedInCities || [],
    };

    // Call Claude AI with all signals
    const result = await ai.analyzePassengerRisk(passengerData);

    // Update / create passenger record in DB with latest AI result
    const passenger = await Passenger.findOneAndUpdate(
      { platformRiderId: riderId },
      {
        ...passengerData,
        riskScore:   result.score,
        riskLevel:   result.level,
        riskFactors: result.factors || [],
        aiNotes:     result.reasoning,
        lastUpdated: Date.now(),
      },
      { upsert: true, new: true }
    );

    res.json({
      passenger,
      assessment: result,
      // Summary for quick display
      summary: {
        score:          result.score,
        level:          result.level,
        recommendation: result.recommendation,
        confidence:     result.confidence,
        reasoning:      result.reasoning,
        redFlags:       result.redFlags || [],
      }
    });

  } catch (err) {
    console.error('[Passenger Check]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/passengers/report — community report by a driver
exports.reportPassenger = async (req, res) => {
  try {
    const { riderId, reportType, description } = req.body;
    if (!riderId || !reportType) return res.status(400).json({ error: 'riderId and reportType required' });

    const passenger = await Passenger.findOneAndUpdate(
      { platformRiderId: riderId },
      {
        $inc:      { reportCount: 1 },
        $addToSet: { reportTypes: reportType },
        $push:     { reportHistory: { type: reportType, description, reportedAt: new Date() } },
      },
      { upsert: true, new: true }
    );

    res.json({
      message: `Passenger reported. ${passenger.reportCount} total driver report(s) on this account.`,
      passenger
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
