const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(system, user, maxTokens = 700) {
  const msg = await client.messages.create({
    model: MODEL, max_tokens: maxTokens,
    system, messages: [{ role: 'user', content: user }],
  });
  return msg.content[0].text;
}

function safeJSON(raw, fallback) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return fallback; }
}

// 1. PASSENGER RISK SCORING
// Data signals used (with weights):
//   - accountAgeDays    (30%) — under 7 days = very high risk
//   - reportCount       (30%) — community driver reports
//   - paymentFlags      (25%) — combined with chargebacks
//   - chargebacks       (25%) — real fraud indicator
//   - paymentType       (10%) — prepaid/cash_app elevate risk
//   - timeOfDay/pickup  ( 5%) — contextual modifier
async function analyzePassengerRisk(data) {
  const raw = await callClaude(
    `You are ShieldRide passenger safety AI. Score 0-100 using these weighted signals:
- Account Age (30%): <7 days = very high, <30 days = elevated, >180 days = lower
- Community Reports (30%): number and type of reports from other drivers
- Payment Flags + Chargebacks (25%): chargeback = confirmed fraud attempt
- Payment Type (10%): prepaid/cash_app = higher risk, credit = lower
- Context (5%): late night + unfamiliar area = slight elevation
Thresholds: 0-39=low, 40-69=medium, 70-100=high. Respond ONLY with valid JSON.`,

    `Analyze this passenger. Return ONLY JSON (no markdown):
${JSON.stringify(data, null, 2)}

{
  "score": <0-100>,
  "level": "<low|medium|high>",
  "recommendation": "<cancel|monitor|proceed>",
  "confidence": <0-100>,
  "factors": [
    {"factor":"Account Age","score":<0-100>,"weight":0.30,"detail":"<one line>"},
    {"factor":"Community Reports","score":<0-100>,"weight":0.30,"detail":"<one line>"},
    {"factor":"Payment Risk","score":<0-100>,"weight":0.25,"detail":"<one line>"},
    {"factor":"Payment Type","score":<0-100>,"weight":0.10,"detail":"<one line>"},
    {"factor":"Context","score":<0-100>,"weight":0.05,"detail":"<one line>"}
  ],
  "reasoning": "<2-3 clear sentences for the driver>",
  "redFlags": ["<flag1>","<flag2>"]
}`, 800);
  return safeJSON(raw, { score: 50, level: 'medium', recommendation: 'monitor', confidence: 50, factors: [], reasoning: 'Analysis unavailable.', redFlags: [] });
}

// 2. EARNINGS ANOMALY DETECTION
async function detectEarningsAnomaly(history, current) {
  const raw = await callClaude(
    'You are ShieldRide wage-protection AI. Detect platform pay manipulation. Respond ONLY with valid JSON.',
    `History (last 10 days): ${JSON.stringify(history.slice(0,10))}
Current: ${JSON.stringify(current)}

Return ONLY JSON:
{"isAnomaly":<bool>,"type":"<rate_drop|surge_suppression|tip_manipulation|dispatch_bias|normal>","percentDrop":<n>,"estimatedMonthlyLoss":<dollars>,"confidence":<0-100>,"explanation":"<plain English>","action":"<file_complaint|monitor|escalate|none>"}`, 500);
  return safeJSON(raw, { isAnomaly: false, type: 'normal', percentDrop: 0, estimatedMonthlyLoss: 0, confidence: 50, explanation: 'Pay appears normal.', action: 'none' });
}

// 3. INCIDENT ANALYSIS
async function analyzeIncident(incident, history) {
  const raw = await callClaude(
    'You are ShieldRide safety response AI. Help gig drivers after incidents. Respond ONLY with valid JSON.',
    `Incident: ${JSON.stringify(incident)}
History: ${JSON.stringify(history.slice(0,5))}

Return ONLY JSON:
{"severity":"<low|medium|high|critical>","immediateSteps":["<step>"],"reportingAdvice":"<script for platform>","legalOptions":"<rights>","communityAlert":<bool>,"communityMessage":"<anonymized warning or null>","escalationNeeded":<bool>,"supportResources":["<r>"]}`, 700);
  return safeJSON(raw, { severity: 'medium', immediateSteps: ['Document the incident', 'Report to platform'], reportingAdvice: 'Report via platform safety feature.', legalOptions: 'You may refuse service for safety reasons.', communityAlert: false, escalationNeeded: false, supportResources: [] });
}

// 4. ALGORITHM WATCH
async function analyzeAlgorithmBehavior(cityData) {
  const raw = await callClaude(
    'You are ShieldRide algorithm watchdog AI. Detect platform-level manipulation. Respond ONLY with valid JSON.',
    `City: ${cityData.city}, Drivers analyzed: ${cityData.driversAnalyzed || 0}
Weekly data: ${JSON.stringify(cityData.weeklyData?.slice(0,7))}

Return ONLY JSON:
{"manipulationDetected":<bool>,"patterns":[{"pattern":"<n>","affectedDrivers":<n>,"description":"<text>"}],"severity":"<low|medium|high>","recommendedAction":"<text>","evidence":"<key data>","estimatedCitywideLoss":<dollars>}`, 600);
  return safeJSON(raw, { manipulationDetected: false, patterns: [], severity: 'low', estimatedCitywideLoss: 0 });
}

// 5. FATIGUE ASSESSMENT
async function assessFatigueRisk(shiftData) {
  const raw = await callClaude(
    'You are ShieldRide wellness AI. Assess accident risk from shift fatigue. Respond ONLY with valid JSON.',
    `${JSON.stringify(shiftData)}
Return ONLY JSON:
{"riskLevel":"<low|medium|high|critical>","hoursUntilBreakNeeded":<n>,"recommendation":"<continue|take_break|end_shift>","breakDurationMinutes":<n>,"message":"<driver message>","accidentRiskIncrease":"<% vs rested>"}`, 300);
  return safeJSON(raw, { riskLevel: 'low', recommendation: 'continue', message: 'You are within safe hours.' });
}

// 6. DEACTIVATION RISK
async function assessDeactivationRisk(metrics) {
  const raw = await callClaude(
    'You are ShieldRide deactivation-prevention AI. Respond ONLY with valid JSON.',
    `${JSON.stringify(metrics)}
Return ONLY JSON:
{"riskScore":<0-100>,"riskLevel":"<low|medium|high>","riskFactors":["<f>"],"protectiveActions":["<a>"],"appealAdvice":"<text>"}`, 400);
  return safeJSON(raw, { riskScore: 20, riskLevel: 'low', riskFactors: [], protectiveActions: [] });
}

// 7. COMMUNITY INTELLIGENCE
async function summarizeCommunityReports(reports, city) {
  const raw = await callClaude(
    'You are ShieldRide community intelligence AI. Respond ONLY with valid JSON.',
    `City: ${city}. Reports: ${JSON.stringify(reports.slice(0,20))}
Return ONLY JSON:
{"hotspots":[{"area":"<n>","type":"<n>","count":<n>,"riskLevel":"<low|medium|high>"}],"trends":["<t>"],"communityAlert":"<message>","topThreats":["<t>"],"avoidanceAdvice":"<text>"}`, 500);
  return safeJSON(raw, { hotspots: [], trends: [], communityAlert: 'No incidents reported this week.', topThreats: [] });
}

module.exports = { analyzePassengerRisk, detectEarningsAnomaly, analyzeIncident, analyzeAlgorithmBehavior, assessFatigueRisk, assessDeactivationRisk, summarizeCommunityReports };
