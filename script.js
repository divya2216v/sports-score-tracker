// IPL Sports Score Tracker Frontend Engine
const API_URL = 'http://localhost:5000/api';

// State management
let state = {
  activeTab: 'live',
  matches: [],
  players: [],
  currentFilter: 'all',
  activeMatchForUpdate: null
};

// Team Franchise mapping
const TEAM_NAMES = {
  CSK: 'Chennai Super Kings',
  MI: 'Mumbai Indians',
  RCB: 'Royal Challengers Bengaluru',
  KKR: 'Kolkata Knight Riders',
  RR: 'Rajasthan Royals',
  SRH: 'Sunrisers Hyderabad',
  DC: 'Delhi Capitals',
  PBKS: 'Punjab Kings',
  GT: 'Gujarat Titans',
  LSG: 'Lucknow Super Giants'
};

// Helper to get request headers with admin authentication
function getHeaders() {
  const adminKey = sessionStorage.getItem('adminKey') || '';
  return {
    'Content-Type': 'application/json',
    'x-admin-key': adminKey
  };
}

// Helper to check and toggle admin dashboard visibility
function checkAdminAuth() {
  const adminKey = sessionStorage.getItem('adminKey');
  const authContainer = document.getElementById('admin-auth-container');
  const consoleWrapper = document.getElementById('admin-console-wrapper');

  if (adminKey) {
    if (authContainer) authContainer.style.display = 'none';
    if (consoleWrapper) consoleWrapper.style.display = 'block';
  } else {
    if (authContainer) authContainer.style.display = 'block';
    if (consoleWrapper) consoleWrapper.style.display = 'none';
  }
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initForms();
  initModals();
  initFilters();

  // Initial loading
  checkAPIConnection();
  loadData();

  // Auto refresh live scores/stats every 10 seconds (realistic match rhythm)
  setInterval(() => {
    if (state.activeTab === 'live') {
      fetchMatches();
    } else if (state.activeTab === 'stats') {
      fetchPlayers();
    }
  }, 10000);

  // Simulation Toggle Action
  const btnSimulate = document.getElementById('btn-simulate');
  if (btnSimulate) {
    btnSimulate.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_URL}/matches/simulate`, { method: 'POST' });
        const data = await res.json();

        if (data.status === 'running') {
          btnSimulate.innerHTML = '<i class="fa-solid fa-gamepad"></i> Simulating...';
          btnSimulate.classList.remove('btn-accent-outline');
          btnSimulate.classList.add('btn-primary');
          showToast('Live match simulation activated!');
        } else {
          btnSimulate.innerHTML = '<i class="fa-solid fa-gamepad"></i> Toggle Live Simulation';
          btnSimulate.classList.remove('btn-primary');
          btnSimulate.classList.add('btn-accent-outline');
          showToast('Simulation stopped.');
        }
      } catch (err) {
        showToast('Error toggling live simulation.', 'error');
      }
    });
  }

  // Admin Login Submission
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('admin-password').value;

      try {
        const res = await fetch(`${API_URL}/players/rebuild`, {
          method: 'POST',
          headers: { 'x-admin-key': password }
        });

        if (res.status === 401) {
          showToast('Authentication failed: Invalid password.', 'error');
          document.getElementById('admin-password').value = '';
        } else {
          sessionStorage.setItem('adminKey', password);
          showToast('Authentication successful!');
          document.getElementById('admin-password').value = '';
          checkAdminAuth();
          fetchMatches();
        }
      } catch (err) {
        showToast('Connection error during authentication.', 'error');
      }
    });
  }

  // Admin Logout Action
  const logoutBtn = document.getElementById('btn-admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('adminKey');
      showToast('Logged out of Admin Console.');
      checkAdminAuth();
    });
  }
});

// 1. Check API Connection Status
async function checkAPIConnection() {
  const badge = document.getElementById('db-status-badge');
  try {
    const res = await fetch(`${API_URL}/matches/live`);
    if (res.ok) {
      badge.className = 'badge badge-success';
      badge.innerHTML = '<span class="pulse-dot"></span> API Connected';
    } else {
      throw new Error();
    }
  } catch (error) {
    badge.className = 'badge badge-live';
    badge.innerHTML = '<span class="pulse-dot"></span> Offline / Connecting...';
    showToast('Could not connect to backend server. Make sure node backend is running on port 5000.', 'error');
  }
}

// 2. Load all dynamic data
async function loadData() {
  await fetchMatches();
  await fetchPlayers();
}

// 3. Tab Switching Setup
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // Activate clicked
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      state.activeTab = tabName;
      document.getElementById(`tab-${tabName}`).classList.add('active');

      // Trigger context-specific data fetches
      if (tabName === 'stats') {
        fetchPlayers();
      } else if (tabName === 'admin') {
        checkAdminAuth();
        fetchMatches();
      } else {
        fetchMatches();
      }
    });
  });
}

// 4. Filter buttons setup (Schedule/Results)
function initFilters() {
  const filters = document.querySelectorAll('.filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.getAttribute('data-filter');
      renderSchedule();
    });
  });
}

// 5. Fetch Matches API
async function fetchMatches() {
  try {
    const res = await fetch(`${API_URL}/matches`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    const data = await res.json();
    state.matches = data;

    renderLiveMatches();
    renderSchedule();
    renderAdminMatchesTable();
  } catch (err) {
    console.error('Error fetching matches:', err);
  }
}

// 6. Fetch Players / Leaderboard API
async function fetchPlayers() {
  try {
    // Fetch Orange Cap race (sorted by runs)
    const orangeRes = await fetch(`${API_URL}/players?sortBy=runs&limit=15`);
    const orangePlayers = await orangeRes.json();

    // Fetch Purple Cap race (sorted by wickets)
    const purpleRes = await fetch(`${API_URL}/players?sortBy=wickets&limit=15`);
    const purplePlayers = await purpleRes.json();

    state.players = orangePlayers; // Cache default

    renderCapLeaders(orangePlayers[0], purplePlayers[0]);
    renderLeaderboards(orangePlayers, purplePlayers);
  } catch (err) {
    console.error('Error fetching players:', err);
  }
}

// 7. Render Cap Leaders Banner
function renderCapLeaders(orangeLeader, purpleLeader) {
  const orangeBox = document.getElementById('orange-cap-leader-box');
  const purpleBox = document.getElementById('purple-cap-leader-box');

  if (orangeLeader && orangeLeader.runs > 0) {
    orangeBox.innerHTML = `
      <div class="leader-info">
        <span class="player-name">${orangeLeader.name}</span>
        <span class="player-team">${orangeLeader.team}</span>
      </div>
      <div class="leader-stat">${orangeLeader.runs} <small>Runs (${orangeLeader.matchesPlayed} matches)</small></div>
    `;
  } else {
    orangeBox.innerHTML = `
      <div class="leader-info">
        <span class="player-name">TBD</span>
        <span class="player-team">No stats recorded</span>
      </div>
      <div class="leader-stat">--</div>
    `;
  }

  if (purpleLeader && purpleLeader.wickets > 0) {
    purpleBox.innerHTML = `
      <div class="leader-info">
        <span class="player-name">${purpleLeader.name}</span>
        <span class="player-team">${purpleLeader.team}</span>
      </div>
      <div class="leader-stat">${purpleLeader.wickets} <small>Wkts (${purpleLeader.matchesPlayed} matches)</small></div>
    `;
  } else {
    purpleBox.innerHTML = `
      <div class="leader-info">
        <span class="player-name">TBD</span>
        <span class="player-team">No stats recorded</span>
      </div>
      <div class="leader-stat">--</div>
    `;
  }
}

// 8. Render Leaderboards (Orange / Purple cap tables)
function renderLeaderboards(orangePlayers, purplePlayers) {
  const orangeTbody = document.getElementById('orange-cap-tbody');
  const purpleTbody = document.getElementById('purple-cap-tbody');

  // Orange cap (Runs)
  if (orangePlayers.length === 0) {
    orangeTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No batsman records logged. Set a match to 'Completed' with batting scorecards.</td></tr>`;
  } else {
    orangeTbody.innerHTML = orangePlayers.map((player, idx) => {
      const strikeRate = player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td><strong>${player.name}</strong></td>
          <td><span class="badge logo-${player.team}">${player.team}</span></td>
          <td>${player.matchesPlayed}</td>
          <td class="orange-text font-bold">${player.runs}</td>
          <td>${player.balls}</td>
          <td>${strikeRate}</td>
        </tr>
      `;
    }).join('');
  }

  // Purple cap (Wickets)
  if (purplePlayers.length === 0) {
    purpleTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No bowler records logged. Set a match to 'Completed' with bowling scorecards.</td></tr>`;
  } else {
    purpleTbody.innerHTML = purplePlayers.map((player, idx) => {
      const economy = player.oversConceded > 0 ? (player.runsConceded / player.oversConceded).toFixed(2) : '0.00';
      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td><strong>${player.name}</strong></td>
          <td><span class="badge logo-${player.team}">${player.team}</span></td>
          <td>${player.matchesPlayed}</td>
          <td class="purple-text font-bold">${player.wickets}</td>
          <td>${player.oversConceded.toFixed(1)}</td>
          <td>${economy}</td>
        </tr>
      `;
    }).join('');
  }
}

// 9. Render Live Match cards
function renderLiveMatches() {
  const container = document.getElementById('live-matches-container');
  const liveMatches = state.matches.filter(m => m.status === 'Live');

  document.getElementById('live-matches-count').innerText = `${liveMatches.length} Active`;

  if (liveMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-tower-broadcast text-muted"></i>
        <h3>No matches are currently LIVE</h3>
        <p>Go to the <strong>Schedule & Results</strong> or <strong>Admin Panel</strong> tab to kick off an upcoming match.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = liveMatches.map(match => {
    const isFirstInnings = match.currentInnings === 1;
    const battingTeam = isFirstInnings ? match.teamA : match.teamB;
    const bowlingTeam = isFirstInnings ? match.teamB : match.teamA;

    // Sort batsmen and bowlers for summary view
    const topBatsmen = (match.batsmenStats || [])
      .filter(b => b.team === battingTeam && b.outStatus === 'not out')
      .slice(0, 2);
    const topBowlers = (match.bowlerStats || [])
      .filter(bw => bw.team === bowlingTeam)
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 1);

    return `
      <div class="live-card">
        <div class="card-header">
          <span class="badge badge-live"><span class="pulse-dot"></span> LIVE</span>
          <span class="venue-text"><i class="fa-solid fa-location-dot"></i> ${match.venue}</span>
        </div>
        <div class="card-body">
          <div class="teams-container">
            <div class="team-row">
              <div class="team-name-info">
                <span class="team-logo-placeholder logo-${match.teamA}">${match.teamA}</span>
                <div class="team-details">
                  <h4>${TEAM_NAMES[match.teamA] || match.teamA}</h4>
                  ${match.tossWinner === match.teamA ? `<p><i class="fa-solid fa-circle-info"></i> Won toss & chose to ${match.tossDecision}</p>` : ''}
                </div>
              </div>
              <div class="team-score">
                <div class="score-numbers">${match.teamAScore.runs}/${match.teamAScore.wickets}</div>
                <div class="overs-count">${match.teamAScore.overs.toFixed(1)} Ov</div>
              </div>
            </div>

            <div class="team-row">
              <div class="team-name-info">
                <span class="team-logo-placeholder logo-${match.teamB}">${match.teamB}</span>
                <div class="team-details">
                  <h4>${TEAM_NAMES[match.teamB] || match.teamB}</h4>
                  ${match.tossWinner === match.teamB ? `<p><i class="fa-solid fa-circle-info"></i> Won toss & chose to ${match.tossDecision}</p>` : ''}
                </div>
              </div>
              <div class="team-score">
                <div class="score-numbers">${match.teamBScore.runs}/${match.teamBScore.wickets}</div>
                <div class="overs-count">${match.teamBScore.overs.toFixed(1)} Ov</div>
              </div>
            </div>
          </div>

          <div class="toss-info-line">
            <span>Innings: <strong>${match.currentInnings}nd</strong></span>
            <span>Target: <strong>${isFirstInnings ? 'TBD' : match.teamAScore.runs + 1}</strong></span>
          </div>

          <!-- Dynamic Active Players overlay -->
          ${topBatsmen.length > 0 || topBowlers.length > 0 ? `
            <div style="background-color: rgba(22, 31, 51, 0.5); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-top: 1rem; font-size: 0.8rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;">
                <span>🏏 Batting: ${topBatsmen.map(b => `${b.name} (${b.runs}/${b.balls})`).join(', ') || 'No batsmen logged'}</span>
              </div>
              <div>
                <span>🎳 Bowling: ${topBowlers.map(b => `${b.name} (${b.wickets}/${b.runsConceded})`).join(', ') || 'No bowler logged'}</span>
              </div>
            </div>
          ` : ''}
          <div class="win-prediction-section" id="win-pred-${match._id}">
            <div class="win-prediction-header">
              <div class="win-prediction-title"><i class="fa-solid fa-chart-line"></i> Win Probability</div>
              <div class="win-prob-pills">
                <span class="win-pill win-pill-a">${match.teamA} --</span>
                <span class="win-pill win-pill-b">${match.teamB} --</span>
              </div>
            </div>
            <div class="prediction-chart-wrap"><canvas id="win-chart-${match._id}"></canvas></div>
            <div class="win-meter-bar">
              <div class="win-meter-fill-a" style="width:50%"></div>
              <div class="win-meter-fill-b" style="width:50%"></div>
            </div>
            <div class="prediction-insight">Calculating...</div>
          </div>
          <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm btn-block" onclick="openUpdateModal('${match._id}')" style="width:100%;">
              <i class="fa-solid fa-pen-to-square"></i> Live Scorecard Console
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  setTimeout(initWinPredictions, 50);
}

// 10. Render Schedule and results list
function renderSchedule() {
  const container = document.getElementById('schedule-container');
  let filteredMatches = state.matches;

  if (state.currentFilter !== 'all') {
    filteredMatches = state.matches.filter(m => m.status === state.currentFilter);
  }

  if (filteredMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-calendar-times"></i>
        <h3>No matches found</h3>
        <p>No fixtures found matching status: <strong>${state.currentFilter}</strong>.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredMatches.map(match => {
    let statusBadge = '';
    let scorecardText = '';

    if (match.status === 'Live') {
      statusBadge = `<span class="badge badge-live"><span class="pulse-dot"></span> LIVE</span>`;
      scorecardText = `<div class="schedule-score text-gold font-bold">${match.teamAScore.runs}/${match.teamAScore.wickets} vs ${match.teamBScore.runs}/${match.teamBScore.wickets}</div>`;
    } else if (match.status === 'Completed') {
      statusBadge = `<span class="badge badge-completed">Completed</span>`;
      scorecardText = `<div class="schedule-score font-bold">${match.teamAScore.runs}/${match.teamAScore.wickets} vs ${match.teamBScore.runs}/${match.teamBScore.wickets}</div>`;
    } else {
      statusBadge = `<span class="badge badge-scheduled">Scheduled</span>`;
      scorecardText = `<div class="schedule-score text-muted">vs</div>`;
    }

    const dateStr = new Date(match.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    return `
      <div class="schedule-card">
        <div class="schedule-teams">
          <div class="schedule-team-label">
            <span class="badge logo-${match.teamA}">${match.teamA}</span>
          </div>
          <span class="schedule-vs">vs</span>
          <div class="schedule-team-label">
            <span class="badge logo-${match.teamB}">${match.teamB}</span>
          </div>
        </div>

        ${scorecardText}

        <div class="schedule-info">
          <div class="schedule-date"><i class="fa-solid fa-clock"></i> ${dateStr}</div>
          <div class="schedule-venue"><i class="fa-solid fa-location-dot"></i> ${match.venue}</div>
        </div>

        <div class="schedule-status-row">
          ${statusBadge}
          ${match.status === 'Live' ? `
            <button class="btn btn-accent btn-sm" onclick="openUpdateModal('${match._id}')"><i class="fa-solid fa-sliders"></i> Track</button>
          ` : ''}
          ${match.status === 'Scheduled' ? `
            <button class="btn btn-secondary-outline btn-sm" onclick="startMatchLive('${match._id}')"><i class="fa-solid fa-play text-gold"></i> Start Live</button>
          ` : ''}
        </div>
      </div>
      ${match.status === 'Completed' && match.result ? `
        <div class="match-result-banner" style="margin-top: -0.75rem; margin-bottom: 1.25rem; border-radius: 0 0 var(--radius-md) var(--radius-md);">
          🎉 ${match.result}
        </div>
      ` : ''}
    `;
  }).join('');
}

// 11. Render Admin matches management table
function renderAdminMatchesTable() {
  const tbody = document.getElementById('admin-matches-tbody');

  if (state.matches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No matches scheduled yet. Use the form above to add a match.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.matches.map(match => {
    const dateStr = new Date(match.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    let statusClass = 'badge-scheduled';
    if (match.status === 'Live') statusClass = 'badge-live';
    if (match.status === 'Completed') statusClass = 'badge-completed';

    return `
      <tr>
        <td><strong>${match.teamA} vs ${match.teamB}</strong></td>
        <td>${dateStr}</td>
        <td>${match.venue}</td>
        <td><span class="badge ${statusClass}">${match.status}</span></td>
        <td>
          <span style="font-weight:600">${match.teamAScore.runs}/${match.teamAScore.wickets} (${match.teamAScore.overs.toFixed(1)} Ov)</span>
          <br>
          <span style="font-weight:600">${match.teamBScore.runs}/${match.teamBScore.wickets} (${match.teamBScore.overs.toFixed(1)} Ov)</span>
        </td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-accent btn-xs" onclick="openUpdateModal('${match._id}')"><i class="fa-solid fa-edit"></i> Edit</button>
            <button class="btn btn-danger btn-xs" onclick="deleteMatch('${match._id}')"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 12. Init forms (Add Match & Add Player)
function initForms() {
  // Add Match Form
  const addMatchForm = document.getElementById('add-match-form');
  addMatchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const teamA = document.getElementById('teamA').value;
    const teamB = document.getElementById('teamB').value;
    const date = document.getElementById('match-date').value;
    const venue = document.getElementById('match-venue').value;
    const tossWinner = document.getElementById('toss-winner').value;
    const tossDecision = document.getElementById('toss-decision').value;

    if (teamA === teamB) {
      showToast('Opponents cannot be the same franchise!', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA, teamB, date, venue, tossWinner, tossDecision })
      });

      if (!res.ok) throw new Error();

      showToast('IPL Match scheduled successfully!');
      addMatchForm.reset();
      fetchMatches();
    } catch (err) {
      showToast('Failed to schedule match. Try running backend.', 'error');
    }
  });

  // Add Player Form
  const addPlayerForm = document.getElementById('add-player-form');
  addPlayerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('player-name').value;
    const team = document.getElementById('player-team').value;

    try {
      const res = await fetch(`${API_URL}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, team })
      });

      if (!res.ok) {
        const errorData = await res.json();
        showToast(errorData.message || 'Error registering player.', 'error');
        return;
      }

      showToast(`Registered player ${name} for ${team}!`);
      addPlayerForm.reset();
      fetchPlayers();
    } catch (err) {
      showToast('Failed to register player.', 'error');
    }
  });

  // Rebuild Tournament Stats
  const btnRebuild = document.getElementById('btn-rebuild-stats');
  btnRebuild.addEventListener('click', async () => {
    try {
      btnRebuild.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rebuilding...';
      const res = await fetch(`${API_URL}/players/rebuild`, { method: 'POST' });
      if (!res.ok) throw new Error();
      showToast('Successfully recalculated all player leaderboards!');
      fetchPlayers();
    } catch (err) {
      showToast('Rebuilding player stats failed.', 'error');
    } finally {
      btnRebuild.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Rebuild Tournament Stats';
    }
  });
}

// 13. Match score direct updates
async function startMatchLive(matchId) {
  try {
    const res = await fetch(`${API_URL}/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Live' })
    });
    if (!res.ok) throw new Error();
    showToast('Match is now LIVE!');
    fetchMatches();
  } catch (err) {
    showToast('Error modifying match status.', 'error');
  }
}

async function deleteMatch(matchId) {
  if (!confirm('Are you sure you want to delete this match fixture? All stats associated will be lost.')) return;
  try {
    const res = await fetch(`${API_URL}/matches/${matchId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Match deleted successfully.');
    fetchMatches();
  } catch (err) {
    showToast('Error deleting match.', 'error');
  }
}

// 14. Modals operations
function initModals() {
  const modal = document.getElementById('update-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const scorecardForm = document.getElementById('update-match-scorecard-form');

  closeBtn.onclick = () => modal.classList.remove('open');
  cancelBtn.onclick = () => modal.classList.remove('open');

  window.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  };

  // Add Dynamic Batsman Row
  document.getElementById('btn-add-batsman-row').addEventListener('click', () => {
    addBatsmanRow();
  });

  // Add Dynamic Bowler Row
  document.getElementById('btn-add-bowler-row').addEventListener('click', () => {
    addBowlerRow();
  });

  // Handle Increments Click
  document.querySelectorAll('.score-inc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.getAttribute('data-team');
      const type = btn.getAttribute('data-type');
      const val = Number(btn.getAttribute('data-val'));

      if (team === 'A') {
        if (type === 'run') {
          const runInput = document.getElementById('score-runs-a');
          runInput.value = Number(runInput.value) + val;
        } else if (type === 'wkt') {
          const wktInput = document.getElementById('score-wkts-a');
          wktInput.value = Math.min(10, Number(wktInput.value) + val);
        }
      } else {
        if (type === 'run') {
          const runInput = document.getElementById('score-runs-b');
          runInput.value = Number(runInput.value) + val;
        } else if (type === 'wkt') {
          const wktInput = document.getElementById('score-wkts-b');
          wktInput.value = Math.min(10, Number(wktInput.value) + val);
        }
      }
    });
  });

  // Save Scorecard Submit
  scorecardForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const matchId = document.getElementById('modal-match-id').value;

    const teamAScore = {
      runs: Number(document.getElementById('score-runs-a').value),
      wickets: Number(document.getElementById('score-wkts-a').value),
      overs: Number(document.getElementById('score-overs-a').value)
    };

    const teamBScore = {
      runs: Number(document.getElementById('score-runs-b').value),
      wickets: Number(document.getElementById('score-wkts-b').value),
      overs: Number(document.getElementById('score-overs-b').value)
    };

    const status = document.getElementById('modal-status').value;
    const currentInnings = Number(document.getElementById('modal-current-innings').value);
    const result = document.getElementById('modal-result').value;

    // Collect Batsmen Stats from dynamic inputs
    const batsmenStats = [];
    const batRows = document.querySelectorAll('#modal-batsmen-tbody tr');
    batRows.forEach(row => {
      const name = row.querySelector('.bat-name').value;
      if (!name) return;

      batsmenStats.push({
        name: name,
        team: row.querySelector('.bat-team').value,
        runs: Number(row.querySelector('.bat-runs').value) || 0,
        balls: Number(row.querySelector('.bat-balls').value) || 0,
        fours: Number(row.querySelector('.bat-fours').value) || 0,
        sixes: Number(row.querySelector('.bat-sixes').value) || 0,
        outStatus: row.querySelector('.bat-outStatus').value
      });
    });

    // Collect Bowler Stats from dynamic inputs
    const bowlerStats = [];
    const bowlRows = document.querySelectorAll('#modal-bowler-tbody tr');
    bowlRows.forEach(row => {
      const name = row.querySelector('.bowl-name').value;
      if (!name) return;

      bowlerStats.push({
        name: name,
        team: row.querySelector('.bowl-team').value,
        overs: Number(row.querySelector('.bowl-overs').value) || 0,
        runsConceded: Number(row.querySelector('.bowl-runs-conceded').value) || 0,
        wickets: Number(row.querySelector('.bowl-wickets').value) || 0
      });
    });

    const updatePayload = {
      teamAScore,
      teamBScore,
      status,
      currentInnings,
      result,
      batsmenStats,
      bowlerStats
    };

    try {
      const res = await fetch(`${API_URL}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!res.ok) throw new Error();

      showToast('Match Scorecard updated successfully!');
      modal.classList.remove('open');
      fetchMatches();
      fetchPlayers();
    } catch (err) {
      showToast('Error saving scorecard updates.', 'error');
    }
  });
}

// 15. Open Update Modal and fill fields
async function openUpdateModal(matchId) {
  try {
    const res = await fetch(`${API_URL}/matches`);
    const matches = await res.json();
    const match = matches.find(m => m._id === matchId);
    if (!match) return;

    state.activeMatchForUpdate = match;

    document.getElementById('modal-match-id').value = match._id;
    document.getElementById('modal-match-title').innerText = `${match.teamA} vs ${match.teamB} - Scorecard Console`;

    // Team names
    document.getElementById('label-team-a').innerText = match.teamA;
    document.getElementById('label-team-b').innerText = match.teamB;

    // Team scores
    document.getElementById('score-runs-a').value = match.teamAScore.runs;
    document.getElementById('score-wkts-a').value = match.teamAScore.wickets;
    document.getElementById('score-overs-a').value = match.teamAScore.overs;

    document.getElementById('score-runs-b').value = match.teamBScore.runs;
    document.getElementById('score-wkts-b').value = match.teamBScore.wickets;
    document.getElementById('score-overs-b').value = match.teamBScore.overs;

    // Meta details
    document.getElementById('modal-status').value = match.status;
    document.getElementById('modal-current-innings').value = match.currentInnings;
    document.getElementById('modal-result').value = match.result || '';

    // Clear dynamic tables
    document.getElementById('modal-batsmen-tbody').innerHTML = '';
    document.getElementById('modal-bowler-tbody').innerHTML = '';

    // Populate Batsmen
    if (match.batsmenStats && match.batsmenStats.length > 0) {
      match.batsmenStats.forEach(b => addBatsmanRow(b));
    } else {
      addBatsmanRow({ team: match.teamA }); // add starter rows
    }

    // Populate Bowlers
    if (match.bowlerStats && match.bowlerStats.length > 0) {
      match.bowlerStats.forEach(bw => addBowlerRow(bw));
    } else {
      addBowlerRow({ team: match.teamB }); // add starter rows
    }

    // Open Modal
    document.getElementById('update-modal').classList.add('open');
  } catch (err) {
    showToast('Failed to load match updates details.', 'error');
  }
}

// Helper to add batsman scorecard fields row
function addBatsmanRow(data = {}) {
  const tbody = document.getElementById('modal-batsmen-tbody');
  const tr = document.createElement('tr');

  const currentMatch = state.activeMatchForUpdate;
  const teamA = currentMatch ? currentMatch.teamA : 'CSK';
  const teamB = currentMatch ? currentMatch.teamB : 'MI';

  const teamVal = data.team || teamA;
  const nameVal = data.name || '';
  const runsVal = data.runs !== undefined ? data.runs : 0;
  const ballsVal = data.balls !== undefined ? data.balls : 0;
  const foursVal = data.fours !== undefined ? data.fours : 0;
  const sixesVal = data.sixes !== undefined ? data.sixes : 0;
  const statusVal = data.outStatus || 'not out';

  tr.innerHTML = `
    <td>
      <input type="text" class="bat-name" value="${nameVal}" placeholder="Player Name" style="width:100%;" required>
    </td>
    <td>
      <select class="bat-team" style="width:100%;">
        <option value="${teamA}" ${teamVal === teamA ? 'selected' : ''}>${teamA}</option>
        <option value="${teamB}" ${teamVal === teamB ? 'selected' : ''}>${teamB}</option>
      </select>
    </td>
    <td><input type="number" class="bat-runs" min="0" value="${runsVal}" style="width:60px;"></td>
    <td><input type="number" class="bat-balls" min="0" value="${ballsVal}" style="width:60px;"></td>
    <td><input type="number" class="bat-fours" min="0" value="${foursVal}" style="width:45px;"></td>
    <td><input type="number" class="bat-sixes" min="0" value="${sixesVal}" style="width:45px;"></td>
    <td>
      <select class="bat-outStatus" style="width:100%;">
        <option value="not out" ${statusVal === 'not out' ? 'selected' : ''}>not out</option>
        <option value="bowled" ${statusVal === 'bowled' ? 'selected' : ''}>bowled</option>
        <option value="caught" ${statusVal === 'caught' ? 'selected' : ''}>caught</option>
        <option value="lbw" ${statusVal === 'lbw' ? 'selected' : ''}>lbw</option>
        <option value="run out" ${statusVal === 'run out' ? 'selected' : ''}>run out</option>
      </select>
    </td>
    <td>
      <button type="button" class="btn btn-danger btn-xs" onclick="this.closest('tr').remove()" style="padding:2px 6px;">&times;</button>
    </td>
  `;
  tbody.appendChild(tr);
}

// Helper to add bowler scorecard fields row
function addBowlerRow(data = {}) {
  const tbody = document.getElementById('modal-bowler-tbody');
  const tr = document.createElement('tr');

  const currentMatch = state.activeMatchForUpdate;
  const teamA = currentMatch ? currentMatch.teamA : 'CSK';
  const teamB = currentMatch ? currentMatch.teamB : 'MI';

  const teamVal = data.team || teamB;
  const nameVal = data.name || '';
  const oversVal = data.overs !== undefined ? data.overs : 0;
  const runsConVal = data.runsConceded !== undefined ? data.runsConceded : 0;
  const wktsVal = data.wickets !== undefined ? data.wickets : 0;

  tr.innerHTML = `
    <td>
      <input type="text" class="bowl-name" value="${nameVal}" placeholder="Player Name" style="width:100%;" required>
    </td>
    <td>
      <select class="bowl-team" style="width:100%;">
        <option value="${teamA}" ${teamVal === teamA ? 'selected' : ''}>${teamA}</option>
        <option value="${teamB}" ${teamVal === teamB ? 'selected' : ''}>${teamB}</option>
      </select>
    </td>
    <td><input type="number" step="0.1" class="bowl-overs" min="0" value="${oversVal}" style="width:60px;"></td>
    <td><input type="number" class="bowl-runs-conceded" min="0" value="${runsConVal}" style="width:60px;"></td>
    <td><input type="number" class="bowl-wickets" min="0" max="10" value="${wktsVal}" style="width:60px;"></td>
    <td>
      <button type="button" class="btn btn-danger btn-xs" onclick="this.closest('tr').remove()" style="padding:2px 6px;">&times;</button>
    </td>
  `;
  tbody.appendChild(tr);
}

// 16. Alert Toast message system
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  toastMsg.innerText = message;

  if (type === 'error') {
    toastIcon.className = 'fa-solid fa-circle-exclamation';
    toastIcon.style.color = 'var(--danger)';
  } else {
    toastIcon.className = 'fa-solid fa-circle-check';
    toastIcon.style.color = 'var(--success)';
  }

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
// ============================================================
// ANIMATION PATCH - paste this at the BOTTOM of your script.js
// ============================================================

/* ---------- 1. CRICKET BALL LOADER ---------- */
function showLoader(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="ipl-loader">
      <div class="cricket-ball">
        <div class="ball-seam"></div>
        <div class="ball-seam seam2"></div>
      </div>
      <p class="loader-text">Loading...</p>
    </div>`;
}

/* ---------- 2. ANIMATED SCORE COUNTER ---------- */
function animateCount(element, from, to, duration = 800) {
  const start = performance.now();
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(from + (to - from) * eased);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ---------- 3. SCORE FLASH ON INCREMENT ---------- */
function flashScore(inputEl, color = '#f59e0b') {
  inputEl.style.transition = 'none';
  inputEl.style.background = color;
  inputEl.style.color = '#000';
  inputEl.style.transform = 'scale(1.15)';
  setTimeout(() => {
    inputEl.style.transition = 'all 0.5s ease';
    inputEl.style.background = '';
    inputEl.style.color = '';
    inputEl.style.transform = 'scale(1)';
  }, 300);
}

/* ---------- 4. PARTICLE BURST (wickets / sixes) ---------- */
function burstParticles(x, y, color = '#f59e0b', count = 18) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'ipl-particle';
    p.style.cssText = `left:${x}px;top:${y}px;background:${color};`;
    document.body.appendChild(p);
    const angle = (i / count) * 360;
    const dist = 60 + Math.random() * 60;
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * dist;
    const ty = Math.sin(rad) * dist;
    p.style.setProperty('--tx', tx + 'px');
    p.style.setProperty('--ty', ty + 'px');
    p.classList.add('burst');
    setTimeout(() => p.remove(), 800);
  }
}

/* ---------- 5. CARD ENTRANCE ANIMATION ---------- */
function animateCardsIn(selector) {
  const cards = document.querySelectorAll(selector);
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(28px)';
    card.style.transition = 'none';
    setTimeout(() => {
      card.style.transition = `opacity 0.45s ease ${i * 0.08}s, transform 0.45s ease ${i * 0.08}s`;
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 30);
  });
}

/* ---------- 6. TOAST SLIDE-UP with icon pop ---------- */
const _origShowToast = showToast;
window.showToast = function (message, type = 'success') {
  _origShowToast(message, type);
  const icon = document.getElementById('toast-icon');
  if (icon) {
    icon.style.transform = 'scale(0)';
    setTimeout(() => {
      icon.style.transition = 'transform 0.3s cubic-bezier(0.175,0.885,0.32,1.6)';
      icon.style.transform = 'scale(1)';
    }, 50);
  }
};

/* ---------- 7. WIRE UP increment buttons with particles + flash ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.score-inc-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const team = btn.getAttribute('data-team');
      const type = btn.getAttribute('data-type');
      const val = Number(btn.getAttribute('data-val'));
      const runInput = document.getElementById(`score-runs-${team.toLowerCase()}`);
      const wktInput = document.getElementById(`score-wkts-${team.toLowerCase()}`);

      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (type === 'run') {
        flashScore(runInput, val === 6 ? '#8b5cf6' : val === 4 ? '#f59e0b' : '#10b981');
        if (val === 6) burstParticles(cx, cy, '#8b5cf6', 22);
        else if (val === 4) burstParticles(cx, cy, '#f59e0b', 14);
      } else if (type === 'wkt') {
        flashScore(wktInput, '#ef4444');
        burstParticles(cx, cy, '#ef4444', 20);
      }
    });
  });

  // Animate live cards after render
  const observer = new MutationObserver(() => {
    animateCardsIn('.live-card');
    animateCardsIn('.schedule-card');
  });
  const lc = document.getElementById('live-matches-container');
  const sc = document.getElementById('schedule-container');
  if (lc) observer.observe(lc, { childList: true });
  if (sc) observer.observe(sc, { childList: true });

  // Number counter for live count badge
  const origRenderLive = window.renderLiveMatches;
  // Animate score numbers already in DOM after each fetch
  document.addEventListener('scoresUpdated', () => {
    document.querySelectorAll('.score-numbers').forEach(el => {
      el.classList.add('score-pop');
      setTimeout(() => el.classList.remove('score-pop'), 400);
    });
  });
});
// ============================================================
// WIN PREDICTION PATCH — paste this at the BOTTOM of script.js
// ============================================================

const chartInstances = {};
const predictionHistory = {};

function calculateWinProbability(match) {
  const isFirst = match.currentInnings === 1;
  const aScore = match.teamAScore;
  const bScore = match.teamBScore;
  const TOTAL_OVERS = 20;

  if (isFirst) {
    const oversA = Math.max(aScore.overs, 0.1);
    const crr = aScore.runs / oversA;
    const oversLeft = TOTAL_OVERS - oversA;
    const projected = aScore.runs + crr * oversLeft;
    const wktPenalty = aScore.wickets * 4;
    const strength = Math.min(Math.max((projected - wktPenalty) / 180, 0.2), 0.85);
    const teamAWin = Math.round(strength * 100);
    return { teamAWin, teamBWin: 100 - teamAWin };
  }

  const target = aScore.runs + 1;
  const runsNeeded = target - bScore.runs;
  const oversLeft = Math.max(TOTAL_OVERS - bScore.overs, 0.1);
  const rrr = runsNeeded / oversLeft;
  const crr = bScore.runs / Math.max(bScore.overs, 0.1);
  const wicketsLeft = 10 - bScore.wickets;

  if (runsNeeded <= 0) return { teamAWin: 2, teamBWin: 98 };
  if (wicketsLeft <= 0 || oversLeft <= 0) return { teamAWin: 98, teamBWin: 2 };

  const rrrAdvantage = rrr - crr;
  const wicketFactor = wicketsLeft / 10;
  const oversFactor = oversLeft / TOTAL_OVERS;

  let bChance = 50 - (rrrAdvantage * 6) + (wicketFactor * 20) - (oversFactor * 5);
  bChance = Math.min(Math.max(bChance, 3), 97);

  return { teamAWin: Math.round(100 - bChance), teamBWin: Math.round(bChance) };
}

function getInsightText(match, prob) {
  const isFirst = match.currentInnings === 1;
  const aScore = match.teamAScore;
  const bScore = match.teamBScore;

  if (isFirst) {
    if (aScore.wickets >= 7) return `⚠️ ${match.teamA} losing wickets rapidly!`;
    const crr = aScore.runs / Math.max(aScore.overs, 0.1);
    if (crr > 10) return `🔥 ${match.teamA} on fire! CRR: ${crr.toFixed(1)}`;
    if (crr < 6) return `😰 ${match.teamA} struggling — CRR: ${crr.toFixed(1)}`;
    return `📊 ${match.teamA} building a steady innings`;
  }

  const target = aScore.runs + 1;
  const runsNeeded = target - bScore.runs;
  const oversLeft = Math.max(20 - bScore.overs, 0.1);
  const rrr = runsNeeded / oversLeft;

  if (prob.teamBWin > 75) return `💪 ${match.teamB} cruising! RRR: ${rrr.toFixed(1)}`;
  if (prob.teamAWin > 75) return `🏆 ${match.teamA} defending well! RRR: ${rrr.toFixed(1)}`;
  if (rrr > 14) return `😱 Asking rate soaring — ${rrr.toFixed(1)} per over!`;
  if (rrr < 7) return `✅ ${match.teamB} in control. RRR: ${rrr.toFixed(1)}`;
  return `⚡ Thriller! ${runsNeeded} needed off ${Math.round(oversLeft * 6)} balls`;
}

function renderWinPrediction(match) {
  const id = match._id;
  const prob = calculateWinProbability(match);

  if (!predictionHistory[id]) predictionHistory[id] = [];
  const history = predictionHistory[id];
  const label = match.currentInnings === 1
    ? `${match.teamAScore.overs.toFixed(1)}Ov`
    : `${match.teamBScore.overs.toFixed(1)}Ov`;
  history.push({ label, aWin: prob.teamAWin, bWin: prob.teamBWin });
  if (history.length > 20) history.shift();

  const container = document.getElementById(`win-pred-${id}`);
  if (!container) return;

  const pillA = container.querySelector('.win-pill-a');
  const pillB = container.querySelector('.win-pill-b');
  if (pillA) pillA.textContent = `${match.teamA} ${prob.teamAWin}%`;
  if (pillB) pillB.textContent = `${match.teamB} ${prob.teamBWin}%`;

  const fillA = container.querySelector('.win-meter-fill-a');
  const fillB = container.querySelector('.win-meter-fill-b');
  if (fillA) fillA.style.width = prob.teamAWin + '%';
  if (fillB) fillB.style.width = prob.teamBWin + '%';

  const insight = container.querySelector('.prediction-insight');
  if (insight) insight.textContent = getInsightText(match, prob);

  const canvas = document.getElementById(`win-chart-${id}`);
  if (!canvas) return;

  const labels = history.map(h => h.label);
  const dataA = history.map(h => h.aWin);
  const dataB = history.map(h => h.bWin);

  if (chartInstances[id]) {
    const chart = chartInstances[id];
    chart.data.labels = labels;
    chart.data.datasets[0].data = dataA;
    chart.data.datasets[1].data = dataB;
    chart.update('active');
  } else {
    chartInstances[id] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: match.teamA,
            data: dataA,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            tension: 0.4,
            fill: true
          },
          {
            label: match.teamB,
            data: dataB,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#f59e0b',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeInOutQuart' },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f1829',
            borderColor: '#24304c',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#f8fafc',
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}% win chance`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(36,48,76,0.5)' },
            ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 6 }
          },
          y: {
            min: 0, max: 100,
            grid: { color: 'rgba(36,48,76,0.5)' },
            ticks: { color: '#475569', font: { size: 9 }, callback: v => v + '%' }
          }
        }
      }
    });
  }
}

function initWinPredictions() {
  const liveMatches = state.matches.filter(m => m.status === 'Live');

  // Cleanup stale charts
  Object.keys(chartInstances).forEach(id => {
    if (!liveMatches.find(m => m._id === id)) {
      chartInstances[id].destroy();
      delete chartInstances[id];
      delete predictionHistory[id];
    }
  });

  liveMatches.forEach(match => renderWinPrediction(match));
}


