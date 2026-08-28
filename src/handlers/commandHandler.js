const { REST, Routes } = require('discord.js');
const { config } = require('../config/config');
const commands = require('../commands');
async function registerCommands(){const rest=new REST({version:'10'}).setToken(config.token);const route=config.guildId?Routes.applicationGuildCommands(config.clientId,config.guildId):Routes.applicationCommands(config.clientId);await rest.put(route,{body:commands.map(c=>c.data.toJSON())});console.log(`Registered ${commands.length} commands`);}
module.exports={registerCommands};
