require('dotenv').config();
const ids = v => new Set(String(v || '').split(',').map(x => x.trim()).filter(Boolean));
const config = { token: process.env.DISCORD_TOKEN, clientId: process.env.DISCORD_CLIENT_ID, guildId: process.env.DISCORD_GUILD_ID || undefined, ownerIds: ids(process.env.BOT_OWNER_IDS), adminIds: ids(process.env.BOT_ADMIN_IDS), mongoUri: process.env.MONGODB_URI, mongoDbName: process.env.MONGODB_DB_NAME || 'economy-bot', currencyName: process.env.CURRENCY_NAME || 'Peso', currencySymbol: process.env.CURRENCY_SYMBOL || '¥', startingBalance: Number(process.env.STARTING_BALANCE || 100), dailyReward: Number(process.env.DAILY_REWARD || 500) };
function validateConfig() { const missing = ['DISCORD_TOKEN','DISCORD_CLIENT_ID','MONGODB_URI'].filter(k => !process.env[k]); if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`); }
const isOwner = id => config.ownerIds.has(id); const isBotAdmin = id => isOwner(id) || config.adminIds.has(id);
module.exports = { config, validateConfig, isOwner, isBotAdmin };
