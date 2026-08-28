const fs = require('node:fs/promises');
const path = require('node:path');
const { config } = require('./config');

const EMPTY_DB = { users: {}, guilds: {} };
let db = structuredClone(EMPTY_DB);

async function initDatabase() {
  await fs.mkdir(path.dirname(config.dataFile), { recursive: true });
  try {
    const raw = await fs.readFile(config.dataFile, 'utf8');
    db = { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await saveDatabase();
  }
}

async function saveDatabase() {
  await fs.writeFile(config.dataFile, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

function getUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      balance: config.startingBalance,
      bank: 0,
      inventory: {},
      lastDailyAt: null,
      createdAt: new Date().toISOString(),
    };
  }
  return db.users[userId];
}

function getGuild(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = { disabledChannels: [] };
  }
  return db.guilds[guildId];
}

function getLeaderboard(limit = 10) {
  return Object.entries(db.users)
    .sort(([, a], [, b]) => (b.balance + b.bank) - (a.balance + a.bank))
    .slice(0, limit);
}

module.exports = { initDatabase, saveDatabase, getUser, getGuild, getLeaderboard };
