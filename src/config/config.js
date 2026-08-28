const path = require('node:path');

function parseIds(value) {
  return new Set(String(value || '').split(',').map((id) => id.trim()).filter(Boolean));
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID || undefined,
  ownerIds: parseIds(process.env.BOT_OWNER_IDS),
  adminIds: parseIds(process.env.BOT_ADMIN_IDS),
  currencyName: 'Peso',
  currencySymbol: '¥',
  startingBalance: Number(process.env.STARTING_BALANCE || 100),
  dailyReward: Number(process.env.DAILY_REWARD || 500),
  dataFile: path.resolve(process.env.DATA_FILE || './src/database/economy.json'),
};

function validateConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

const isOwner = (id) => config.ownerIds.has(id);
const isBotAdmin = (id) => isOwner(id) || config.adminIds.has(id);

module.exports = { config, validateConfig, isOwner, isBotAdmin };
