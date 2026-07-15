// frontend/js/api.js — All API calls. Single source of truth.
const API_BASE = '/api';

const getToken  = () => localStorage.getItem('sr_token');
const getDriver = () => JSON.parse(localStorage.getItem('sr_driver') || 'null');
const setDriver = d  => localStorage.setItem('sr_driver', JSON.stringify(d));

async function req(endpoint, opts = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try { res = await fetch(`${API_BASE}${endpoint}`, { ...opts, headers }); }
  catch { throw new Error('Server offline. Run: npm start'); }
  if (res.status === 401) { localStorage.clear(); location.href='/login.html'; return; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

window.API = {
  isLoggedIn: () => !!getToken(),
  logout: () => { localStorage.clear(); location.href = '/login.html'; },

  auth: {
    me: () => req('/auth/me'),
  },
  trips: {
    log:    d         => req('/trips', { method:'POST', body:JSON.stringify(d) }),
    getAll: (p={})    => req(`/trips?${new URLSearchParams(p)}`),
    stats:  ()        => req('/trips/stats'),
    cancel: (id, r)   => req(`/trips/${id}/cancel`, { method:'PUT', body:JSON.stringify({ reason:r }) }),
  },
  earnings: {
    log:     d        => req('/earnings', { method:'POST', body:JSON.stringify(d) }),
    history: (days=30)=> req(`/earnings?days=${days}`),
    summary: ()       => req('/earnings/summary'),
  },
  alerts: {
    getAll:     ()    => req('/alerts'),
    dismiss:    id    => req(`/alerts/${id}/dismiss`, { method:'PUT' }),
    markAllRead:()    => req('/alerts/read-all', { method:'PUT' }),
  },
  incidents: {
    report: d         => req('/incidents', { method:'POST', body:JSON.stringify(d) }),
    getAll: ()        => req('/incidents'),
    stats:  ()        => req('/incidents/stats'),
  },
  passengers: {
    check:  d         => req('/passengers/check',  { method:'POST', body:JSON.stringify(d) }),
    report: d         => req('/passengers/report', { method:'POST', body:JSON.stringify(d) }),
  },
  ai: {
    algorithm:   ()   => req('/ai/algorithm'),
    fatigue:     d    => req('/ai/fatigue',      { method:'POST', body:JSON.stringify(d) }),
    deactivation:d    => req('/ai/deactivation', { method:'POST', body:JSON.stringify(d) }),
  },
  community: {
    reports: (city)   => req(`/community${city ? '?city='+encodeURIComponent(city) : ''}`),
  },
};

window.getDriver = getDriver;

// Button loading helper
window.setBtnLoading = (id, loading, label) => {
  const b = document.getElementById(id);
  if (!b) return;
  b.disabled = loading;
  b.innerHTML = loading ? '<span class="spinner"></span> Please wait...' : label;
};
