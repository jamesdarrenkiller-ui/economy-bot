const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUser } = require('../../database/database');
const { config } = require('../../config/config');
const { formatMoney } = require('../../config/currency');

module.exports = {
  data: new SlashCommandBuilder().setName('weekly').setDescription('Claim your weekly Peso reward'),
  async execute(interaction) {
    const user = await getUser(interaction.user.id);
    const cooldown = 7 * 24 * 60 * 60 * 1000;
    if (user.lastWeeklyAt && Date.now() - user.lastWeeklyAt.getTime() < cooldown) {
      return interaction.reply({ content: '⏳ Your weekly reward is still on cooldown.', ephemeral: true });
    }
    const reward = config.weeklyReward;
    user.balance += reward;
    user.lifetimeEarned += reward;
    user.lastWeeklyAt = new Date();
    await saveUser(user);
    return interaction.reply(`🎁 You received **${formatMoney(reward)}**.`);
  }
};
