const mongoose = require('mongoose');

const batsmanStatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: String, required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  outStatus: { type: String, default: 'not out' } // e.g., 'not out', 'caught', 'bowled', 'run out', 'lbw'
});

const bowlerStatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: String, required: true },
  overs: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 }
});

const matchSchema = new mongoose.Schema({
  teamA: { type: String, required: true },
  teamB: { type: String, required: true },
  teamAScore: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 }
  },
  teamBScore: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Live', 'Completed'],
    default: 'Scheduled'
  },
  date: { type: Date, default: Date.now },
  venue: { type: String, required: true },
  tossWinner: { type: String },
  tossDecision: { type: String, enum: ['bat', 'bowl'] },
  currentInnings: { type: Number, default: 1 },
  result: { type: String, default: '' },
  batsmenStats: [batsmanStatSchema],
  bowlerStats: [bowlerStatSchema]
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
