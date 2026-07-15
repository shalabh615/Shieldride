[README.md](https://github.com/user-attachments/files/30045650/README.md)
# 🛡 ShieldRide — AI Gig Driver Protection Platform

Full-stack app. One folder. Open in VS Code and follow 4 steps.

---

## ▶ How to Run (4 Steps)

### Step 1 — Open in VS Code
```
File → Open Folder → select  shieldride-final
```

### Step 2 — Add your keys to `.env`
Open `.env` and fill in:
```
MONGO_URI=mongodb://localhost:27017/shieldride
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx   ← get at console.anthropic.com
```
MongoDB must be running locally, or use a free Atlas cluster URI.

### Step 3 — Install & Seed
Open the VS Code terminal (`Ctrl + `` ` ``) and run:
```bash
npm install          # installs all dependencies
npm run seed         # fills database with demo data
```

### Step 4 — Start
```bash
npm start            # or: npm run dev  (auto-restarts on file changes)
```

Open your browser: **http://localhost:5000**

---

## 🔑 Demo Login
```
Email:    marcus@shieldride.demo
Password: password123
```

---

## 📁 File Structure
```
shieldride-final/
│
├── server.js                   ← Start here. Express app entry point.
├── package.json                ← All deps + npm scripts
├── .env                        ← YOUR KEYS GO HERE
│
├── backend/
│   ├── config/database.js      ← MongoDB connection
│   ├── middleware/auth.js       ← JWT protection for all routes
│   ├── models/
│   │   ├── Driver.js            ← User/driver schema
│   │   ├── Trip.js              ← Trip records
│   │   └── models.js            ← Alert, Incident, Passenger, EarningsRecord
│   ├── services/
│   │   └── aiService.js         ← All 7 Claude AI functions
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tripController.js
│   │   ├── earningsController.js
│   │   ├── incidentController.js
│   │   ├── alertController.js
│   │   ├── passengerController.js
│   │   ├── aiController.js
│   │   └── communityController.js
│   └── routes/
│       ├── auth.js / trips.js / earnings.js / alerts.js
│       ├── incidents.js / passengers.js / ai.js / community.js
│
├── frontend/
│   ├── index.html              ← Main dashboard (8 pages)
│   ├── login.html              ← Login + register
│   ├── css/styles.css          ← All styles
│   └── js/
│       ├── api.js              ← Fetch wrapper for all API calls
│       └── app.js              ← UI logic wired to API
│
└── database/
    └── seed.js                 ← Demo data loader
```

---

## 🤖 AI Features (Claude-Powered)

| Feature | What it does |
|---|---|
| Passenger Risk Scoring | 0–100 score based on account age, payment flags, community reports |
| Earnings Anomaly Detection | Compares current pay vs 30-day baseline, flags drops |
| Incident Analysis | Analyzes safety reports, generates legal guidance |
| Algorithm Watch | Detects city-wide platform manipulation patterns |
| Fatigue Assessment | Calculates accident risk by shift length |
| Deactivation Risk | Predicts wrongful deactivation probability |
| Community Intelligence | Summarizes city reports into driver alerts |

---

## 📡 API Endpoints

```
POST  /api/auth/register
POST  /api/auth/login
GET   /api/auth/me

POST  /api/trips              ← logs trip + runs AI risk check
GET   /api/trips/stats
PUT   /api/trips/:id/cancel

POST  /api/earnings           ← logs earnings + anomaly detection
GET   /api/earnings/summary

POST  /api/passengers/check   ← AI risk check
POST  /api/passengers/report

POST  /api/incidents          ← AI guidance returned
GET   /api/incidents/stats

GET   /api/alerts
PUT   /api/alerts/:id/dismiss

GET   /api/ai/algorithm       ← city-wide analysis
POST  /api/ai/fatigue
POST  /api/ai/deactivation

GET   /api/community
```
