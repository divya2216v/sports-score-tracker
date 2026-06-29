# IPL Sports Score Tracker

A modern, responsive, full-stack IPL (Indian Premier League) Cricket Score Tracker. Features a live match dashboard, fixtures scheduler, Orange Cap & Purple Cap leaderboards, and an interactive scorecard administrator panel to log live matches and record dynamic batsman and bowler stats.

## Project Structure


sports score tracker/
├── backend/
│   ├── controllers/
│   │   ├── matchController.js
│   │   └── playerController.js
│   ├── models/
│   │   ├── Match.js
│   │   └── Player.js
│   ├── routes/
│   │   ├── matchRoutes.js
│   │   └── playerRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js


## Technologies Used

- **Frontend:** HTML5, CSS3 (Modern dark-theme, responsive layouts, CSS animations), JavaScript (ES6, Fetch API)
- **Backend:** Node.js, Express.js (REST APIs)
- **Database:** MongoDB, Mongoose ORM

---

## Getting Started

### 1. Prerequisites

- Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).
- Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) locally and ensure the service is running (default port `27017`).

### 2. Setting Up the Backend

1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the server dependencies:
   ```bash
   npm install
   ```
3. (Optional) Check or update variables in `.env`:
   - `PORT=5000` (Port backend server listens to)
   - `MONGO_URI=mongodb://localhost:27017/ipl_score_tracker` (Your MongoDB URL)
4. Start the server:
   ```bash
   npm start
   ```
   You should see logs confirming connection:
   ```
   Successfully connected to MongoDB Database.
   Server is running and listening on port 5000
   ```

### 3. Serving the Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Open `index.html` directly in your browser, or serve it using a local HTTP server:
   - **Using python:**
     ```bash
     python -m http.server 3000
     ```
     Then open [http://localhost:3000](http://localhost:3000) in your browser.
   - **Using VS Code Live Server Extension:** Right-click `index.html` and choose **"Open with Live Server"**.

---

## Features Guide

1. **Add Match:** In the **Admin Panel** tab, schedule a match by selecting any two IPL franchises (e.g. CSK, MI, RCB, KKR), selecting the date, and inputting the venue.
2. **Register Player:** In the **Admin Panel**, register players for franchises (e.g., "Virat Kohli" for "RCB"). This allows them to be mapped to scores or viewable.
3. **Start Live:** In the **Schedule & Results** tab, click **"Start Live"** on an upcoming match. It moves to the "Live Match Center".
4. **Update Match Score:** In the **Live Scores** or **Admin Panel** tabs, click **"Live Scorecard Console"** / **"Edit"**. This modal lets you:
   - Modify team runs, wickets, and overs.
   - Click quick-action buttons (`+1`, `+4`, `+6`, `+Wkt`) to increment scores instantly.
   - Add/edit batsmanship profiles (Runs, balls, 4s, 6s, Out Status) and bowling figures (Overs, runs conceded, wickets) for the scorecard.
   - End the match by choosing the status **"Completed"** and entering a result message (e.g., "CSK won by 15 runs").
5. **Delete Match:** Remove a fixture instantly from the admin list.
6. **Orange & Purple Cap Leaderboards:** The **Leaderboard** tab automatically aggregates statistics from **Completed** match scorecards and ranks players globally.
   - **Orange Cap:** Ranks players by total runs.
   - **Purple Cap:** Ranks players by total wickets.
