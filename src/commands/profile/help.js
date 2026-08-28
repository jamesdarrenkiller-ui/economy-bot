const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('economy-help').setDescription('View economy commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle('💰 Economy Commands').addFields(
      { name: 'Wallet', value: '`/balance` `/daily` `/weekly` `/monthly` `/pay`\n`/deposit` `/withdraw` `/transactions`' },
      { name: 'Work', value: '`/jobs` `/job` `/work`' },
      { name: 'Shop', value: '`/shop` `/buy` `/sell` `/inventory`' },
      { name: 'Profile', value: '`/profile` `/stats` `/achievements`' },
      { name: 'Leaderboard', value: '`/rich` `/leaderboard`' }
    );
    return interaction.reply({ embeds: [embed] });
  }
};
