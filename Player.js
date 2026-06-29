const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  team: { type: String, required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  oversConceded: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
