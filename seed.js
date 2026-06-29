const mongoose = require('mongoose');
const Match = require('./models/Match');
const Player = require('./models/Player');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipl_score_tracker';

const samplePlayers = [
  { name: 'Virat Kohli', team: 'RCB' },
  { name: 'MS Dhoni', team: 'CSK' },
  { name: 'Rohit Sharma', team: 'MI' },
  { name: 'Jasprit Bumrah', team: 'MI' },
  { name: 'Ravindra Jadeja', team: 'CSK' },
  { name: 'Sunil Narine', team: 'KKR' },
  { name: 'Shreyas Iyer', team: 'KKR' },
  { name: 'Yashasvi Jaiswal', team: 'RR' },
  { name: 'Heinrich Klaasen', team: 'SRH' },
  { name: 'Pat Cummins', team: 'SRH' }
];

const sampleMatches = [
  {
    teamA: 'CSK',
    teamB: 'MI',
    teamAScore: { runs: 182, wickets: 6, overs: 20 },
    teamBScore: { runs: 180, wickets: 7, overs: 20 },
    status: 'Completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    venue: 'M. A. Chidambaram Stadium, Chennai',
    tossWinner: 'CSK',
    tossDecision: 'bat',
    currentInnings: 2,
    result: 'CSK won by 2 runs',
    batsmenStats: [
      { name: 'MS Dhoni', team: 'CSK', runs: 48, balls: 22, fours: 3, sixes: 4, outStatus: 'not out' },
      { name: 'Ravindra Jadeja', team: 'CSK', runs: 22, balls: 14, fours: 1, sixes: 1, outStatus: 'caught' },
      { name: 'Rohit Sharma', team: 'MI', runs: 65, balls: 38, fours: 6, sixes: 3, outStatus: 'bowled' }
    ],
    bowlerStats: [
      { name: 'Jasprit Bumrah', team: 'MI', overs: 4, runsConceded: 24, wickets: 3 },
      { name: 'Ravindra Jadeja', team: 'CSK', overs: 4, runsConceded: 30, wickets: 2 }
    ]
  },
  {
    teamA: 'RCB',
    teamB: 'KKR',
    teamAScore: { runs: 195, wickets: 3, overs: 18.2 },
    teamBScore: { runs: 0, wickets: 0, overs: 0 },
    status: 'Live',
    date: new Date(), // Today
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    tossWinner: 'RCB',
    tossDecision: 'bat',
    currentInnings: 1,
    result: '',
    batsmenStats: [
      { name: 'Virat Kohli', team: 'RCB', runs: 88, balls: 52, fours: 8, sixes: 4, outStatus: 'not out' },
      { name: 'Shreyas Iyer', team: 'KKR', runs: 0, balls: 0, fours: 0, sixes: 0, outStatus: 'not out' }
    ],
    bowlerStats: [
      { name: 'Sunil Narine', team: 'KKR', overs: 4, runsConceded: 32, wickets: 1 }
    ]
  },
  {
    teamA: 'RR',
    teamB: 'SRH',
    teamAScore: { runs: 0, wickets: 0, overs: 0 },
    teamBScore: { runs: 0, wickets: 0, overs: 0 },
    status: 'Scheduled',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    venue: 'Sawai Mansingh Stadium, Jaipur',
    tossWinner: '',
    tossDecision: 'bat',
    currentInnings: 1,
    result: ''
  },
  {
    teamA: 'GT',
    teamB: 'LSG',
    teamAScore: { runs: 0, wickets: 0, overs: 0 },
    teamBScore: { runs: 0, wickets: 0, overs: 0 },
    status: 'Scheduled',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
    venue: 'Narendra Modi Stadium, Ahmedabad',
    tossWinner: '',
    tossDecision: 'bat',
    currentInnings: 1,
    result: ''
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding.');

    // Clear existing
    await Match.deleteMany({});
    await Player.deleteMany({});
    console.log('Cleared existing matches and players.');

    // Save players
    await Player.insertMany(samplePlayers);
    console.log('Inserted sample players.');

    // Save matches
    await Match.insertMany(sampleMatches);
    console.log('Inserted sample matches.');

    // Rebuild player stats logic dynamically (Orange & Purple Cap stats)
    // We aggregate stats from completed matches
    const completedMatches = await Match.find({ status: 'Completed' });
    const aggStats = {};

    completedMatches.forEach(match => {
      const matchPlayers = new Set();
      
      match.batsmenStats.forEach(b => {
        const name = b.name.trim();
        if (!aggStats[name]) {
          aggStats[name] = { team: b.team, runs: 0, balls: 0, wickets: 0, oversConceded: 0, runsConceded: 0, matchesPlayed: 0 };
        }
        aggStats[name].runs += Number(b.runs) || 0;
        aggStats[name].balls += Number(b.balls) || 0;
        matchPlayers.add(name);
      });

      match.bowlerStats.forEach(bowler => {
        const name = bowler.name.trim();
        if (!aggStats[name]) {
          aggStats[name] = { team: bowler.team, runs: 0, balls: 0, wickets: 0, oversConceded: 0, runsConceded: 0, matchesPlayed: 0 };
        }
        aggStats[name].wickets += Number(bowler.wickets) || 0;
        aggStats[name].oversConceded += Number(bowler.overs) || 0;
        aggStats[name].runsConceded += Number(bowler.runsConceded) || 0;
        matchPlayers.add(name);
      });

      matchPlayers.forEach(p => {
        aggStats[p].matchesPlayed += 1;
      });
    });

    // Update the players in DB
    for (const name of Object.keys(aggStats)) {
      const stats = aggStats[name];
      await Player.updateOne(
        { name: name },
        {
          $set: {
            runs: stats.runs,
            balls: stats.balls,
            wickets: stats.wickets,
            oversConceded: stats.oversConceded,
            runsConceded: stats.runsConceded,
            matchesPlayed: stats.matchesPlayed,
            team: stats.team
          }
        },
        { upsert: true }
      );
    }

    console.log('Tournament statistics compiled successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
