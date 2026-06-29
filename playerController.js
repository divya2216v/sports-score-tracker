const Player = require('../models/Player');
const MatchController = require('./matchController');

// 1. Get all players (with optional sorting or limit)
exports.getAllPlayers = async (req, res) => {
  try {
    const { sortBy, order = 'desc', limit = 20 } = req.query;
    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = order === 'asc' ? 1 : -1;
    } else {
      sortQuery['runs'] = -1; // default to Orange Cap order (runs)
    }

    const players = await Player.find().sort(sortQuery).limit(Number(limit));
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Create / Register new Player
exports.createPlayer = async (req, res) => {
  try {
    const { name, team } = req.body;
    
    // Check if player already exists
    let player = await Player.findOne({ name: name.trim() });
    if (player) {
      return res.status(400).json({ message: 'Player already registered' });
    }

    player = new Player({
      name: name.trim(),
      team: team.trim(),
      runs: 0,
      balls: 0,
      wickets: 0,
      oversConceded: 0,
      runsConceded: 0,
      matchesPlayed: 0
    });

    const savedPlayer = await player.save();
    res.status(201).json(savedPlayer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 3. Force rebuild player statistics from match records
exports.rebuildStats = async (req, res) => {
  try {
    await MatchController.recalculatePlayerStats();
    const players = await Player.find().sort({ runs: -1 });
    res.json({ message: 'Stats successfully rebuilt', players });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
