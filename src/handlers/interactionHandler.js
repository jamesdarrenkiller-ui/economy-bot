const { isBotAdmin } = require('../config/config');
const { getGuild } = require('../database');
const commands = require('../commands');
async function handleInteraction(interaction){if(!interaction.isChatInputCommand())return;const guild=interaction.guildId?await getGuild(interaction.guildId):null;if(guild&&!isBotAdmin(interaction.user.id)&&guild.disabledChannels.includes(interaction.channelId))return interaction.reply({content:'Bot commands are disabled in this channel.',ephemeral:true});const command=commands.find(c=>c.data.name===interaction.commandName);if(command)await command.execute(interaction);}
module.exports={handleInteraction};
