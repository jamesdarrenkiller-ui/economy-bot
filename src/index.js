require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { config, validateConfig } = require('./config/config');
const { connectDatabase } = require('./database/database');
const { registerCommands } = require('./handlers/commandHandler');
const { handleInteraction } = require('./handlers/interactionHandler');
const { handleError } = require('./handlers/errorHandler');

validateConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', async () => {
  await connectDatabase();
  await registerCommands(client);
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Currency: ${config.currencySymbol} ${config.currencyName}`);
});
client.on('interactionCreate', interaction => handleInteraction(interaction).catch(handleError));
client.on('error', handleError);
process.on('unhandledRejection', handleError);
process.on('uncaughtException', handleError);
client.login(config.token);
