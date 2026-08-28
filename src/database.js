const mongoose = require('mongoose');
const { config } = require('./config');

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true }, balance: { type: Number, default: config.startingBalance }, bank: { type: Number, default: 0 },
  inventory: { type: Map, of: Number, default: {} }, lastDailyAt: Date, job: String, lastWorkAt: Date,
  lifetimeEarned: { type: Number, default: 0 }, workCount: { type: Number, default: 0 }, achievements: { type: [String], default: [] }
}, { timestamps: true });
const guildSchema = new mongoose.Schema({ guildId: { type: String, unique: true, index: true }, disabledChannels: { type: [String], default: [] } }, { timestamps: true });
const User = mongoose.models.EconomyUser || mongoose.model('EconomyUser', userSchema);
const Guild = mongoose.models.EconomyGuild || mongoose.model('EconomyGuild', guildSchema);

let connected = false;
async function initDatabase() { await mongoose.connect(config.mongoUri, { dbName: config.mongoDbName }); connected = true; console.log(`MongoDB connected: ${config.mongoDbName}`); }
function assertConnected() { if (!connected) throw new Error('DATABASE_NOT_CONNECTED'); }
function getUser(userId) { assertConnected(); return new User({ userId, balance: config.startingBalance, bank: 0, inventory: {}, achievements: [] }); }
async function loadUser(userId) { assertConnected(); return User.findOneAndUpdate({ userId }, { $setOnInsert: { userId, balance: config.startingBalance } }, { upsert: true, new: true }); }
async function saveUser(user) { assertConnected(); return User.findOneAndUpdate({ userId: user.userId }, user.toObject ? user.toObject() : user, { new: true }); }
async function loadGuild(guildId) { assertConnected(); return Guild.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId, disabledChannels: [] } }, { upsert: true, new: true }); }
async function getLeaderboard(limit = 10) { assertConnected(); return User.find().sort({ balance: -1 }).limit(limit).lean(); }
module.exports = { initDatabase, loadUser, saveUser, loadGuild, getLeaderboard, User, Guild };
