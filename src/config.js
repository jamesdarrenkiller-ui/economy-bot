const path = require('node:path');
require('dotenv').config();

function parseIds(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID || undefined,
  ownerIds: parseIds(process.env.BOT_OWNER_IDS),
  adminIds: parseIds(process.env.BOT_ADMIN_IDS),
  currencyName: process.env.CURRENCY_NAME || 'Coins',
  currencySymbol: process.env.CURRENCY_SYMBOL || '🪙',
  startingBalance: Number(process.env.STARTING_BALANCE || 100),
  dailyReward: Number(process.env.DAILY_REWARD || 500),
  dataFile: path.resolve(process.env.DATA_FILE || './data/economy.json'),
};

function validateConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}

function isOwner(userId) {
  return config.ownerIds.has(userId);
}

function isBotAdmin(userId) {
  return isOwner(userId) || config.adminIds.has(userId);
}

module.exports = { config, validateConfig, isOwner, isBotAdmin };
