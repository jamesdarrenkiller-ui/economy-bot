const { SlashCommandBuilder } = require('discord.js');
const { getLeaderboard } = require('../../database/database');
const { formatMoney } = require('../../config/currency');

module.exports = {
  data: new SlashCommandBuilder().setName('rich').setDescription('Show the richest users'),
  async execute(interaction) {
    const users = await getLeaderboard(10);
    if (!users.length) return interaction.reply('No economy data yet.');
    const lines = users.map((u, i) => `**${i + 1}.** <@${u.userId}> — ${formatMoney((u.balance || 0) + (u.bank || 0))}`);
    return interaction.reply(`💎 **Richest Users**\n${lines.join('\n')}`);
  }
};
