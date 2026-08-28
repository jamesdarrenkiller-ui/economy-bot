const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUser } = require('../../database/database');
const { config } = require('../../config/config');
const { formatMoney } = require('../../config/currency');

module.exports = {
  data: new SlashCommandBuilder().setName('monthly').setDescription('Claim your monthly Peso reward'),
  async execute(interaction) {
    const user = await getUser(interaction.user.id);
    const cooldown = 30 * 24 * 60 * 60 * 1000;
    if (user.lastMonthlyAt && Date.now() - user.lastMonthlyAt.getTime() < cooldown) {
      return interaction.reply({ content: '⏳ Your monthly reward is still on cooldown.', ephemeral: true });
    }
    const reward = config.monthlyReward;
    user.balance += reward;
    user.lifetimeEarned += reward;
    user.lastMonthlyAt = new Date();
    await saveUser(user);
    return interaction.reply(`🎁 You received **${formatMoney(reward)}**.`);
  }
};
