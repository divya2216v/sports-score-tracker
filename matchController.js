const Match = require('../models/Match');
const Player = require('../models/Player');

// Helper to recalculate player stats from all completed matches
async function recalculatePlayerStats() {
  try {
    const completedMatches = await Match.find({ status: 'Completed' });
    const aggStats = {};

    completedMatches.forEach(match => {
      const matchPlayers = new Set();
      
      if (match.batsmenStats && Array.isArray(match.batsmenStats)) {
        match.batsmenStats.forEach(b => {
          if (!b.name) return;
          const name = b.name.trim();
          if (!aggStats[name]) {
            aggStats[name] = { team: b.team || match.teamA, runs: 0, balls: 0, wickets: 0, oversConceded: 0, runsConceded: 0, matchesPlayed: 0 };
          }
          aggStats[name].runs += Number(b.runs) || 0;
          aggStats[name].balls += Number(b.balls) || 0;
          matchPlayers.add(name);
        });
      }

      if (match.bowlerStats && Array.isArray(match.bowlerStats)) {
        match.bowlerStats.forEach(bowler => {
          if (!bowler.name) return;
          const name = bowler.name.trim();
          if (!aggStats[name]) {
            aggStats[name] = { team: bowler.team || match.teamB, runs: 0, balls: 0, wickets: 0, oversConceded: 0, runsConceded: 0, matchesPlayed: 0 };
          }
          aggStats[name].wickets += Number(bowler.wickets) || 0;
          aggStats[name].oversConceded += Number(bowler.overs) || 0;
          aggStats[name].runsConceded += Number(bowler.runsConceded) || 0;
          matchPlayers.add(name);
        });
      }

      matchPlayers.forEach(p => {
        aggStats[p].matchesPlayed += 1;
      });
    });

    const allPlayers = await Player.find();
    const playerMap = {};
    allPlayers.forEach(p => {
      playerMap[p.name.trim()] = p;
    });

    for (const name of Object.keys(aggStats)) {
      const stats = aggStats[name];
      if (playerMap[name]) {
        await Player.updateOne({ _id: playerMap[name]._id }, {
          runs: stats.runs,
          balls: stats.balls,
          wickets: stats.wickets,
          oversConceded: stats.oversConceded,
          runsConceded: stats.runsConceded,
          matchesPlayed: stats.matchesPlayed,
          team: stats.team
        });
        delete playerMap[name];
      } else {
        await Player.create({
          name: name,
          team: stats.team,
          runs: stats.runs,
          balls: stats.balls,
          wickets: stats.wickets,
          oversConceded: stats.oversConceded,
          runsConceded: stats.runsConceded,
          matchesPlayed: stats.matchesPlayed
        });
      }
    }

    for (const name of Object.keys(playerMap)) {
      const playerObj = playerMap[name];
      await Player.updateOne({ _id: playerObj._id }, {
        runs: 0,
        balls: 0,
        wickets: 0,
        oversConceded: 0,
        runsConceded: 0,
        matchesPlayed: 0
      });
    }
  } catch (err) {
    console.error('Error recalculating player stats:', err);
  }
}

// 1. Add Match
exports.createMatch = async (req, res) => {
  try {
    const { teamA, teamB, date, venue, tossWinner, tossDecision } = req.body;
    const newMatch = new Match({
      teamA,
      teamB,
      date,
      venue,
      tossWinner,
      tossDecision,
      teamAScore: { runs: 0, wickets: 0, overs: 0 },
      teamBScore: { runs: 0, wickets: 0, overs: 0 },
      status: 'Scheduled'
    });
    const savedMatch = await newMatch.save();
    res.status(201).json(savedMatch);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 2. Get All Matches
exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find().sort({ date: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Get Live Matches
exports.getLiveMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'Live' }).sort({ updatedAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Get Scheduled Matches
exports.getScheduledMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'Scheduled' }).sort({ date: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Update Match (Scores, Status, Players Scorecard)
exports.updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const matchBefore = await Match.findById(id);
    if (!matchBefore) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const updatedMatch = await Match.findByIdAndUpdate(id, updateData, { new: true });
    
    // Recalculate player statistics if status became completed, was completed, or changes affected stats
    await recalculatePlayerStats();

    res.json(updatedMatch);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 6. Delete Match
exports.deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await Match.findByIdAndDelete(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    // Recalculate player statistics since a match is removed
    await recalculatePlayerStats();

    res.json({ message: 'Match deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export the recalculator so the player controller or server setup can trigger it
// Export the recalculator so the player controller or server setup can trigger it
exports.recalculatePlayerStats = recalculatePlayerStats;

let simulationInterval = null;

exports.simulateMatch = async (req, res) => {
  try {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      return res.json({ status: 'stopped', message: 'Simulation stopped successfully.' });
    }

    simulationInterval = setInterval(async () => {
      try {
        const Match = require('../models/Match');
        const match = await Match.findOne({ status: 'Live' });
        if (!match) return;

        const isFirst = match.currentInnings === 1;
        const score = isFirst ? match.teamAScore : match.teamBScore;
        
        // Simulating runs and balls
        const runsToAdd = [0, 1, 1, 2, 4, 6, 0, 1][Math.floor(Math.random() * 8)];
        const wicketOccurred = Math.random() < 0.08; // 8% chance of wicket per ball
        
        let currentOvers = score.overs;
        let oversInt = Math.floor(currentOvers);
        let balls = Math.round((currentOvers % 1) * 10);
        
        balls += 1;
        if (balls >= 6) {
          oversInt += 1;
          balls = 0;
        }
        
        const nextOvers = oversInt + (balls / 10);
        
        score.runs += runsToAdd;
        if (wicketOccurred) {
          score.wickets = Math.min(10, score.wickets + 1);
        }
        score.overs = nextOvers;

        // Update active batsman in scorecard stats
        const battingTeam = isFirst ? match.teamA : match.teamB;
        if (match.batsmenStats && match.batsmenStats.length > 0) {
          const activeBatsmen = match.batsmenStats.filter(b => b.team === battingTeam && b.outStatus === 'not out');
          if (activeBatsmen.length > 0) {
            const batsman = activeBatsmen[0];
            batsman.runs += runsToAdd;
            batsman.balls += 1;
            if (runsToAdd === 4) batsman.fours += 1;
            if (runsToAdd === 6) batsman.sixes += 1;
            
            if (wicketOccurred) {
              batsman.outStatus = ['caught', 'bowled', 'lbw', 'run out'][Math.floor(Math.random() * 4)];
            }
          }
        }

        // Update bowler statistics in scorecard stats
        const bowlingTeam = isFirst ? match.teamB : match.teamA;
        if (match.bowlerStats && match.bowlerStats.length > 0) {
          const activeBowlers = match.bowlerStats.filter(bw => bw.team === bowlingTeam);
          if (activeBowlers.length > 0) {
            const bowler = activeBowlers[0];
            let bOvers = bowler.overs;
            let bOversInt = Math.floor(bOvers);
            let bBalls = Math.round((bOvers % 1) * 10) + 1;
            if (bBalls >= 6) {
              bOversInt += 1;
              bBalls = 0;
            }
            bowler.overs = bOversInt + (bBalls / 10);
            bowler.runsConceded += runsToAdd;
            if (wicketOccurred) {
              bowler.wickets += 1;
            }
          }
        }

        // Innings transition or completion check
        if (score.overs >= 20 || score.wickets >= 10) {
          if (isFirst) {
            match.currentInnings = 2;
          } else {
            match.status = 'Completed';
            const runsDiff = match.teamAScore.runs - match.teamBScore.runs;
            if (runsDiff > 0) {
              match.result = `${match.teamA} won by ${runsDiff} runs`;
            } else if (runsDiff < 0) {
              const wicketsLeft = 10 - match.teamBScore.wickets;
              match.result = `${match.teamB} won by ${wicketsLeft} wickets`;
            } else {
              match.result = `Match Tied!`;
            }
            clearInterval(simulationInterval);
            simulationInterval = null;
          }
        }

        await Match.updateOne({ _id: match._id }, match);
        await recalculatePlayerStats();
      } catch (err) {
        console.error('Interval simulation error:', err);
      }
    }, 10000); // 10 second simulation updates (realistic ball-by-ball rhythm)

    res.json({ status: 'running', message: 'Simulation started. The live match is updated every 10 seconds.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

