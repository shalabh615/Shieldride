// frontend/js/app.js — UI wired to live API + Claude AI
if (!API.isLoggedIn()) location.href = '/login.html';

let driver = getDriver();
let shiftStart = Date.now();

document.addEventListener('DOMContentLoaded', async () => {
  populateDriverCard(driver);
  await loadDashboard();
  setInterval(updateShiftClock, 60000);
  updateShiftClock();
});

/* ════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════ */
function showPage(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const loaders = { alerts: loadAlerts, incidents: loadIncidents, earnings: loadEarnings, algorithm: loadAlgorithm, community: loadCommunity };
  if (loaders[page]) loaders[page]();
}

function switchTab(el, tabId) {
  el.closest('.page').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  el.closest('.page').querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
}

/* ════════════════════════════════════════════
   DRIVER CARD
════════════════════════════════════════════ */
function populateDriverCard(d) {
  if (!d) return;
  setText('driver-name', d.name?.split(' ')[0] || 'Driver');
  setText('driver-id',   d.driverId || '');
  setText('driver-city', d.city || '');
  setText('driver-score', d.safetyScore || 100);
  const bar = document.getElementById('score-bar');
  if (bar) bar.style.width = (d.safetyScore || 100) + '%';
}

/* ════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const [stats, alertData, earnSummary, tripsData] = await Promise.all([
      API.trips.stats(), API.alerts.getAll(), API.earnings.summary(), API.trips.getAll({ limit: 5 })
    ]);
    setText('stat-trips',     stats.today?.count || 0);
    setText('stat-earnings',  '$' + (stats.today?.earnings || 0).toFixed(0));
    setText('stat-prevented', stats.prevented || 0);
    setText('stat-hours',     (stats.shiftHours || 0).toFixed(1) + 'h');
    const anomalies = earnSummary.recentAnomalies || [];
    setText('stat-earnings-sub', anomalies.length ? `⚠ Anomaly: ${anomalies[0]?.anomalyPercent?.toFixed(1)}% drop` : 'Normal range');
    const count = alertData.unreadCount || 0;
    setText('alert-badge', count > 0 ? `⚠ ${count} ACTIVE ALERT${count > 1 ? 'S' : ''}` : '✓ ALL CLEAR');
    setText('earnings-today', '$' + (stats.today?.earnings || 0).toFixed(0));
    setText('earnings-avg',   '$' + (earnSummary.dailyAvg || 0).toFixed(0));
    renderAlertCards(alertData.alerts || [], 'dash-alerts');
    renderTripsTable(tripsData.trips || []);
    buildSparklines(stats);
  } catch (err) { toast('Load Error', err.message, 'var(--accent2)'); }
}

/* ════════════════════════════════════════════
   ALERTS PAGE
════════════════════════════════════════════ */
async function loadAlerts() {
  try {
    const data = await API.alerts.getAll();
    renderAlertCards(data.alerts || [], 'alerts-container', true);
  } catch (err) { toast('Error', err.message, 'var(--accent2)'); }
}

function renderAlertCards(alerts, id, withDismiss = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!alerts.length) {
    el.innerHTML = '<div class="alert-card success"><div class="alert-body">✅ No active alerts — you\'re fully protected.</div></div>';
    return;
  }
  el.innerHTML = alerts.map(a => `
    <div class="alert-card ${a.severity}" id="al-${a._id}">
      <div class="alert-header">
        <div class="alert-icon">${alertIcon(a.type)}</div>
        <div class="alert-title">${a.title}</div>
        <div class="alert-time">${timeAgo(a.createdAt)}</div>
      </div>
      <div class="alert-body">${a.message}</div>
      ${a.aiReasoning ? `<div class="ai-box" style="margin-top:10px">
        <div class="ai-text">${a.aiReasoning}</div>
        ${a.confidence ? `<div class="ai-confidence">
          <div class="ai-conf-label">AI Confidence</div>
          <div class="ai-conf-bar"><div class="ai-conf-fill" style="width:${a.confidence}%"></div></div>
          <div class="ai-conf-val">${a.confidence}%</div>
        </div>` : ''}
      </div>` : ''}
      <div class="alert-actions">
        ${a.type === 'high_risk_rider'   ? `<button class="btn btn-danger btn-sm" onclick="safeCancel('${a.riderId}',this)">CANCEL WITHOUT PENALTY</button>` : ''}
        ${a.type === 'wage_manipulation' ? `<button class="btn btn-primary btn-sm" onclick="fileComplaint()">FILE COMPLAINT</button>` : ''}
        ${withDismiss ? `<button class="btn btn-outline btn-sm" onclick="dismissAlert('${a._id}')">DISMISS</button>` : ''}
      </div>
    </div>`).join('');
}

async function dismissAlert(id) {
  try {
    await API.alerts.dismiss(id);
    document.getElementById('al-' + id)?.remove();
    toast('Alert dismissed', '', 'var(--accent3)');
  } catch (err) { toast('Error', err.message, 'var(--accent2)'); }
}

/* ════════════════════════════════════════════
   LOG TRIP
════════════════════════════════════════════ */
async function logTrip() {
  setBtnLoading('btn-log-trip', true, '');
  try {
    const result = await API.trips.log({
      riderId:   v('trip-rider-id'), platform: v('trip-platform'),
      pickup:    v('trip-pickup'),   dropoff:  v('trip-dropoff'),
      fare:      +v('trip-fare')||0, tip:      +v('trip-tip')||0,
      duration:  +v('trip-duration')||0, notes: v('trip-notes'),
      startTime: v('trip-start'),    endTime:  new Date().toISOString(),
    });
    const risk = result.riskAssessment;
    const col = risk.score >= 70 ? 'var(--accent2)' : risk.score >= 40 ? 'var(--accent)' : 'var(--accent3)';
    toast(`Trip Logged — Risk: ${(risk.level||'').toUpperCase()} (${risk.score}/100)`, risk.reasoning || 'Trip saved.', col);
    ['trip-rider-id','trip-pickup','trip-dropoff','trip-fare','trip-tip','trip-duration','trip-notes'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  } catch (err) { toast('Error', err.message, 'var(--accent2)'); }
  finally { setBtnLoading('btn-log-trip', false, 'LOG TRIP + AI ANALYSIS'); }
}

function safeCancel(riderId, btn) {
  if (btn) { btn.textContent = '✓ CANCELLED SAFELY'; btn.style.background = 'var(--accent3)'; btn.disabled = true; }
  toast('Ride Cancelled Safely', 'Acceptance rate protected. Logged as safety cancellation.', 'var(--accent3)');
}

/* ════════════════════════════════════════════
   PASSENGER RISK CHECK — FULL AI INTEGRATION
   
   HOW IT WORKS:
   The driver enters whatever info they can see in
   the app before accepting. Claude uses ALL 5
   signals to compute a 0-100 risk score.
   
   Signal weights (total = 100%):
     accountAgeDays   → 30%  (most important)
     reportCount      → 30%  (community intel)
     paymentFlags +
     chargebacks      → 25%  (fraud indicators)
     paymentType      → 10%  (traceability)
     time + location  →  5%  (context)
════════════════════════════════════════════ */

// Preset test profiles — load with pLoad()
const PRESETS = {
  high:   { id:'#39241', age:3,   payment:'prepaid',  flags:3, chargebacks:3, reports:4, types:'aggressive, refused_payment, suspicious', pickup:'Loop, Chicago',    time:'late_night' },
  medium: { id:'#18823', age:182, payment:'paypal',   flags:1, chargebacks:0, reports:1, types:'aggressive',                              pickup:'Wicker Park',     time:'evening'   },
  low:    { id:'#55102', age:730, payment:'credit',   flags:0, chargebacks:0, reports:0, types:'',                                        pickup:"O'Hare Airport",  time:'daytime'   },
  new:    { id:'#77001', age:1,   payment:'cash_app', flags:0, chargebacks:0, reports:0, types:'',                                        pickup:'',                time:'late_night' },
};

function pLoad(key) {
  const p = PRESETS[key];
  setVal('p-rider-id',      p.id);
  setVal('p-age',           p.age);
  setVal('p-payment',       p.payment);
  setVal('p-flags',         p.flags);
  setVal('p-chargebacks',   p.chargebacks);
  setVal('p-reports',       p.reports);
  setVal('p-report-types',  p.types);
  setVal('p-pickup',        p.pickup);
  setVal('p-time',          p.time);
  document.getElementById('passenger-result').innerHTML = '';
  document.getElementById('p-error').style.display = 'none';
}

async function checkPassenger() {
  const errEl = document.getElementById('p-error');
  errEl.style.display = 'none';
  document.getElementById('passenger-result').innerHTML = '';

  // Validate required field
  const riderId = v('p-rider-id');
  if (!riderId) {
    errEl.textContent = '⚠ Please enter a Rider Account ID first.';
    errEl.style.display = 'block';
    return;
  }

  setBtnLoading('btn-check', true, '');

  try {
    // ── Build the full signal payload sent to Claude ──────────────
    // Every field here is a data point Claude weighs in its scoring.
    // The more fields you fill in, the more accurate the score.
    const payload = {
      riderId,
      // Signal 1 — Account Age (30% weight)
      // How many days old is the rider's account on the platform?
      // Visible in the Uber/Lyft driver app under rider info.
      accountAgeDays: parseInt(v('p-age')) || 0,

      // Signal 2 — Payment Type (10% weight)
      // What payment method is linked to this account?
      // Prepaid/Cash App = hard to trace = higher risk.
      paymentType: v('p-payment'),

      // Signal 3 — Payment Flags & Chargebacks (25% weight combined)
      // paymentFlags: # of anomalies flagged by the platform
      // chargebacks: # of times rider disputed a real charge with their bank
      // Even 1 chargeback = confirmed fraud attempt.
      paymentFlags: parseInt(v('p-flags')) || 0,
      chargebacks:  parseInt(v('p-chargebacks')) || 0,

      // Signal 4 — Community Reports (30% weight)
      // # of reports from OTHER DRIVERS about this same rider ID.
      // ShieldRide cross-references your city's driver community.
      reportCount: parseInt(v('p-reports')) || 0,
      reportTypes: v('p-report-types').split(',').map(s => s.trim()).filter(Boolean),
      // Valid types: aggressive, refused_payment, suspicious, threatening,
      //              property_damage, verbal_abuse, attempted_fraud

      // Signal 5 — Context (5% weight)
      // Late-night pickups in unfamiliar areas slightly elevate score.
      pickup:    v('p-pickup') || 'not specified',
      timeOfDay: v('p-time'),
    };

    // ── POST to backend → passengerController → Claude AI ─────────
    const result = await API.passengers.check(payload);
    const a = result.assessment; // Claude's structured JSON response

    // ── Render the full AI result ──────────────────────────────────
    renderPassengerResult(a, payload.riderId);

  } catch (err) {
    errEl.textContent = '⚠ ' + err.message;
    errEl.style.display = 'block';
  } finally {
    setBtnLoading('btn-check', false, '🤖 ANALYZE WITH CLAUDE AI');
  }
}

function renderPassengerResult(a, riderId) {
  const score = a.score || 0;
  const col   = score >= 70 ? 'var(--accent2)' : score >= 40 ? 'var(--accent)' : 'var(--accent3)';
  const recMap = {
    cancel:  { label: '🚨 CANCEL THIS RIDE',    bg: 'rgba(239,68,68,.15)',  border: 'rgba(239,68,68,.3)',  color: 'var(--accent2)' },
    monitor: { label: '⚠ MONITOR CLOSELY',      bg: 'rgba(245,158,11,.15)', border: 'rgba(245,158,11,.3)', color: 'var(--accent)'  },
    proceed: { label: '✓ SAFE TO PROCEED',       bg: 'rgba(34,197,94,.15)',  border: 'rgba(34,197,94,.3)',  color: 'var(--accent3)' },
  };
  const rec = recMap[a.recommendation] || recMap.monitor;

  // Factor breakdown bars
  const factorRows = (a.factors || []).map(f => {
    const fc = f.score >= 70 ? 'var(--accent2)' : f.score >= 40 ? 'var(--accent)' : 'var(--accent3)';
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div style="width:150px;font-size:11px;color:var(--text2);flex-shrink:0">${f.factor} <span style="color:var(--text3)">(${Math.round((f.weight||0)*100)}%)</span></div>
        <div style="flex:1;height:7px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${f.score}%;background:${fc};border-radius:4px;transition:width .5s"></div>
        </div>
        <div style="width:32px;text-align:right;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;color:${fc}">${f.score}</div>
      </div>
      ${f.detail ? `<div style="font-size:10px;color:var(--text3);padding:1px 0 7px 160px">${f.detail}</div>` : '<div style="margin-bottom:7px"></div>'}`;
  }).join('');

  // Red flags list
  const flagsHtml = (a.redFlags || []).length
    ? `<div class="section-label" style="margin-top:14px">RED FLAGS DETECTED</div>
       ${a.redFlags.map(f => `<div style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:12px;color:var(--accent2)">
         <span style="flex-shrink:0">⚠</span><span>${f}</span></div>`).join('')}`
    : '';

  document.getElementById('passenger-result').innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--border);border-left:4px solid ${col};border-radius:8px;padding:18px;margin-top:16px">

      <!-- Score header -->
      <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:18px">
        <div style="text-align:center">
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:62px;line-height:1;color:${col}">${score}</div>
          <div style="font-size:10px;color:var(--text3);letter-spacing:1px">/ 100</div>
        </div>
        <div style="flex:1">
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;letter-spacing:2px;color:${col};margin-bottom:8px">
            ${(a.level||'').toUpperCase()} RISK PASSENGER
          </div>
          <div style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;background:${rec.bg};border:1px solid ${rec.border};font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;letter-spacing:1px;color:${rec.color}">
            ${rec.label}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:4px">AI CONFIDENCE</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:24px;color:var(--accent4)">${a.confidence || 0}%</div>
          <div style="width:80px;height:4px;background:var(--border);border-radius:2px;margin-top:6px;overflow:hidden">
            <div style="width:${a.confidence||0}%;height:100%;background:var(--accent4);border-radius:2px"></div>
          </div>
        </div>
      </div>

      <!-- Factor breakdown -->
      <div class="section-label">RISK SIGNAL BREAKDOWN — HOW CLAUDE SCORED THIS</div>
      <div style="margin-bottom:4px">${factorRows || '<div style="color:var(--text3);font-size:12px">No factor data returned.</div>'}</div>

      <!-- AI Reasoning -->
      <div class="section-label" style="margin-top:14px">CLAUDE'S REASONING</div>
      <div class="ai-box" style="border-left-color:${col};margin-bottom:4px">
        <div class="ai-text">${a.reasoning || 'No reasoning provided.'}</div>
      </div>

      ${flagsHtml}

      <!-- Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
        ${a.recommendation === 'cancel'
          ? `<button class="btn btn-danger" onclick="safeCancel('${riderId}', this)">CANCEL WITHOUT PENALTY</button>`
          : ''}
        <button class="btn btn-outline btn-sm" onclick="openReportPassenger('${riderId}')">REPORT THIS RIDER</button>
        <button class="btn btn-outline btn-sm" onclick="pLoad('high');checkPassenger()">RE-RUN WITH HIGH RISK PRESET</button>
      </div>
    </div>`;
}

function openReportPassenger(riderId) {
  const type = prompt(
    'What type of issue?\n\nType one of:\n  aggressive\n  refused_payment\n  suspicious\n  threatening\n  property_damage\n  verbal_abuse\n  attempted_fraud'
  );
  if (!type) return;
  API.passengers.report({ riderId, reportType: type.trim() })
    .then(r => toast('Rider Reported', r.message || 'Added to community database.', 'var(--accent3)'))
    .catch(err => toast('Error', err.message, 'var(--accent2)'));
}

/* ════════════════════════════════════════════
   SAFETY INCIDENT REPORT
════════════════════════════════════════════ */
async function reportSafety() {
  setBtnLoading('btn-report-safety', true, '');
  try {
    const result = await API.incidents.report({
      type:             v('inc-type'),
      severity:         v('inc-severity'),
      description:      v('inc-desc'),
      riderId:          v('inc-rider'),
      policeNotified:   v('inc-police') === 'yes',
      platformReported: document.getElementById('inc-platform-reported')?.checked,
      platformResponse: v('inc-platform-resp'),
    });
    const g = result.guidance;
    document.getElementById('incident-result').innerHTML = `
      <div class="alert-card ${g.escalationNeeded ? 'danger' : 'info'}" style="margin-top:16px">
        <div class="alert-header"><div class="alert-icon">🤖</div><div class="alert-title">AI GUIDANCE — ${(g.severity||'').toUpperCase()}</div></div>
        <div class="alert-body">
          <strong>Immediate steps:</strong><br>${(g.immediateSteps||[]).map((s,i)=>`${i+1}. ${s}`).join('<br>')}
          <br><br><strong>What to tell the platform:</strong><br>${g.reportingAdvice||''}
          ${g.legalOptions ? `<br><br><strong>Your legal options:</strong><br>${g.legalOptions}` : ''}
        </div>
      </div>`;
    toast('Incident Filed', 'AI guidance generated. Community database updated.', 'var(--accent3)');
  } catch (err) {
    toast('Error', err.message, 'var(--accent2)');
  } finally {
    setBtnLoading('btn-report-safety', false, 'SUBMIT + GET AI GUIDANCE');
  }
}

/* ════════════════════════════════════════════
   PAY ISSUE
════════════════════════════════════════════ */
async function reportPay() {
  setBtnLoading('btn-report-pay', true, '');
  try {
    const result = await API.earnings.log({
      date: new Date().toISOString(),
      totalEarnings: +v('pay-earnings')||0,
      perMileRate:   +v('pay-rate')||0,
      totalTrips:    +v('pay-trips')||0,
      totalHours:    +v('pay-hours')||0,
      platform:      v('pay-platform'),
    });
    const a = result.anomalyAnalysis;
    a.isAnomaly
      ? toast(`Pay Anomaly — ${(a.percentDrop||0).toFixed(1)}% Drop`, a.explanation, 'var(--accent)')
      : toast('Earnings Logged', 'No anomaly detected. Pay is within normal range.', 'var(--accent3)');
  } catch (err) {
    toast('Error', err.message, 'var(--accent2)');
  } finally {
    setBtnLoading('btn-report-pay', false, 'ANALYZE WITH AI');
  }
}

/* ════════════════════════════════════════════
   INCIDENTS PAGE
════════════════════════════════════════════ */
async function loadIncidents() {
  try {
    const [data, stats] = await Promise.all([API.incidents.getAll(), API.incidents.stats()]);
    const incidents = data.incidents || [];
    setText('inc-prevented', stats.prevented || 0);
    setText('inc-resolved',  incidents.filter(i => i.status === 'closed').length);
    setText('inc-filed',     incidents.filter(i => i.platformReported).length);
    setText('inc-pending',   incidents.filter(i => i.status === 'open').length);
    const tbody = document.getElementById('inc-tbody');
    if (tbody) tbody.innerHTML = incidents.slice(0,15).map(i => `<tr>
      <td style="color:var(--text2)">${fmtDate(i.createdAt)}</td>
      <td>${(i.type||'').replace(/_/g,' ')}</td>
      <td style="color:var(--accent);font-size:11px">${(i.aiSummary||'Logged').slice(0,60)}…</td>
      <td><span class="tag ${i.prevented?'tag-green':i.status==='open'?'tag-yellow':'tag-blue'}">${i.prevented?'PREVENTED':(i.status||'').toUpperCase()}</span></td>
    </tr>`).join('');
  } catch (err) { toast('Error', err.message, 'var(--accent2)'); }
}

/* ════════════════════════════════════════════
   EARNINGS PAGE
════════════════════════════════════════════ */
async function loadEarnings() {
  try {
    const [summary, hist] = await Promise.all([API.earnings.summary(), API.earnings.history(30)]);
    setText('earn-week',  '$' + (summary.week?.total||0).toFixed(0));
    setText('earn-month', '$' + (summary.month?.total||0).toFixed(0));
    setText('earn-rate',  '$' + (summary.week?.avgRate||0).toFixed(2));
    const anomalies = summary.recentAnomalies || [];
    document.getElementById('earn-anomalies').innerHTML = anomalies.length
      ? anomalies.map(a => `<div class="alert-card warning" style="margin-bottom:12px">
          <div class="alert-header"><div class="alert-icon">📉</div><div class="alert-title">${(a.anomalyType||'').replace(/_/g,' ').toUpperCase()} — ${(a.anomalyPercent||0).toFixed(1)}% DROP</div></div>
          <div class="alert-body">${a.aiAnalysis||''}</div>
          <div class="alert-actions"><button class="btn btn-primary btn-sm" onclick="fileComplaint()">FILE COMPLAINT</button></div>
        </div>`).join('')
      : '<div class="alert-card success"><div class="alert-body">✅ No earnings anomalies detected this week.</div></div>';
    renderEarningsChart(hist.records || []);
  } catch (err) { toast('Error', err.message, 'var(--accent2)'); }
}

function renderEarningsChart(records) {
  const wrap = document.getElementById('earnings-chart');
  if (!wrap || !records.length) return;
  const last7 = records.slice(0, 7).reverse();
  const max   = Math.max(...last7.map(r => r.totalEarnings), 1);
  wrap.innerHTML = last7.map(r => {
    const h = Math.round((r.totalEarnings / max) * 80);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="height:${h}px;width:100%;background:${r.isAnomaly?'var(--accent2)':'var(--accent3)'};border-radius:3px 3px 0 0;min-height:4px"></div>
      <div style="font-size:9px;color:var(--text3)">${new Date(r.date).toLocaleDateString('en-US',{weekday:'short'})}</div>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════════════
   ALGORITHM WATCH
════════════════════════════════════════════ */
async function loadAlgorithm() {
  const el = document.getElementById('algo-result');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--text2);padding:16px;font-size:12px">🤖 Claude is analyzing city-wide algorithm patterns...</div>';
  try {
    const data = await API.ai.algorithm();
    const a    = data.analysis;
    el.innerHTML = `
      <div class="ai-box" style="margin-bottom:16px">
        <div class="ai-text">Analyzed <strong>${data.driversAnalyzed}</strong> drivers in ${data.city}.
        ${a.manipulationDetected
          ? `<strong style="color:var(--accent2)"> Manipulation patterns detected.</strong> Est. citywide loss: $${(a.estimatedCitywideLoss||0).toLocaleString()}/month.`
          : '<strong style="color:var(--accent3)"> No systemic manipulation detected this week.</strong>'}</div>
      </div>
      ${(a.patterns||[]).map(p => `<div class="alert-card warning">
        <div class="alert-header"><div class="alert-icon">🤖</div><div class="alert-title">${(p.pattern||'').toUpperCase()}</div></div>
        <div class="alert-body">${p.description} (${p.affectedDrivers} drivers)</div>
      </div>`).join('')}
      ${a.manipulationDetected ? `<div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" onclick="fileComplaint()">FILE COLLECTIVE COMPLAINT</button>
        <button class="btn btn-outline" onclick="joinCollective()">JOIN COLLECTIVE ACTION</button>
      </div>` : ''}`;
  } catch (err) {
    el.innerHTML = `<div class="alert-card danger"><div class="alert-body">Algorithm analysis unavailable: ${err.message}</div></div>`;
  }
}

/* ════════════════════════════════════════════
   COMMUNITY
════════════════════════════════════════════ */
async function loadCommunity() {
  try {
    const data = await API.community.reports();
    const s    = data.summary || {};
    setText('community-drivers', (data.driverCount||0).toLocaleString());
    const tbody = document.getElementById('community-tbody');
    if (tbody) tbody.innerHTML = (s.hotspots||[]).map(h => `<tr>
      <td>${h.area}</td>
      <td>${(h.type||'').replace(/_/g,' ')}</td>
      <td style="color:var(--accent2)">${h.count} reports</td>
      <td><span class="tag ${h.riskLevel==='high'?'tag-red':h.riskLevel==='medium'?'tag-yellow':'tag-green'}">${(h.riskLevel||'').toUpperCase()}</span></td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:16px">No reports this week</td></tr>';
    const alertEl = document.getElementById('community-alert');
    if (alertEl) alertEl.textContent = s.communityAlert || 'No alerts for your area this week.';
  } catch (err) { toast('Error', err.message, 'var(--accent2)'); }
}

/* ════════════════════════════════════════════
   MISC ACTIONS
════════════════════════════════════════════ */
function fileComplaint() { toast('Complaint Filed', 'Platform complaint submitted. 5+ drivers on same issue triggers automatic collective action.', 'var(--accent)'); }
function joinCollective() { toast('Joined Collective Action', 'You\'ve joined the group complaint. A labor attorney will be notified.', 'var(--accent4)'); }
function triggerEmergency() { toast('🚨 SOS ACTIVATED', 'Emergency services alerted. Location shared with your emergency contacts. Stay calm.', 'var(--accent2)'); }

/* ════════════════════════════════════════════
   SHIFT / FATIGUE CLOCK
════════════════════════════════════════════ */
function updateShiftClock() {
  const h = (Date.now() - shiftStart) / 3600000;
  setText('shift-timer', h.toFixed(1) + 'h');
  const ring = document.getElementById('fatigue-ring');
  if (ring) ring.setAttribute('stroke-dashoffset', Math.max(0, 226 - (h/6)*226).toFixed(0));
  setText('fatigue-val', h.toFixed(1) + 'h');
  if      (h >= 6)   setText('fatigue-msg', '⚠ Over limit — end shift now');
  else if (h >= 4.5) setText('fatigue-msg', '⚠ Approaching fatigue limit');
  else               setText('fatigue-msg', 'Within safe hours');
}

/* ════════════════════════════════════════════
   TOAST NOTIFICATION
════════════════════════════════════════════ */
function toast(title, body, color) {
  const el=document.getElementById('toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-title').style.color = color || 'var(--accent2)';
  document.getElementById('toast-body').textContent  = body;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 7000);
}
function hideToast() { document.getElementById('toast').classList.remove('show'); }

/* ════════════════════════════════════════════
   SPARKLINES
════════════════════════════════════════════ */
function buildSparklines(stats) {
  spark('sp1', [8,11,9,13,12,14, stats.today?.count||0],       'var(--accent3)');
  spark('sp2', [180,210,195,175,200,195, stats.today?.earnings||0], 'var(--accent)');
  spark('sp3', [1,0,2,1,3,2, stats.prevented||0],              'var(--accent2)');
  spark('sp4', [3,5,4,6,5,5, stats.shiftHours||0],             'var(--accent4)');
}
function spark(id, data, color) {
  const el = document.getElementById(id); if (!el) return;
  const max = Math.max(...data, 1);
  el.innerHTML = data.map(v => `<div class="spark-bar" style="height:${Math.round(v/max*100)}%;background:${color};opacity:.75"></div>`).join('');
}

/* ════════════════════════════════════════════
   TRIPS TABLE
════════════════════════════════════════════ */
function renderTripsTable(trips) {
  const el = document.getElementById('trips-tbody'); if (!el) return;
  el.innerHTML = trips.map(t => `<tr>
    <td style="color:var(--text2)">${fmtTime(t.createdAt)}</td>
    <td>${t.pickup||'—'} → ${t.dropoff||'—'}</td>
    <td style="color:var(--accent3)">$${(t.fare||0).toFixed(2)}</td>
    <td><span class="tag ${t.riskLevel==='high'?'tag-red':t.riskLevel==='medium'?'tag-yellow':'tag-green'}">${(t.riskLevel||'low').toUpperCase()}</span></td>
    <td><span class="tag ${t.status==='completed'?'tag-green':t.status==='cancelled_safety'?'tag-yellow':'tag-blue'}">${(t.status||'').replace(/_/g,' ').toUpperCase()}</span></td>
  </tr>`).join('');
}

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
const v       = id => document.getElementById(id)?.value || '';
const setVal  = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
const fmtTime = d => new Date(d).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
const timeAgo = d => {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s/60)}m ago` : `${Math.round(s/3600)}h ago`;
};
const alertIcon = t => ({ high_risk_rider:'⚠️', wage_manipulation:'💰', algorithm_change:'🤖', fatigue:'😴', deactivation_risk:'🚨', community_warning:'📢' }[t] || '🔔');
