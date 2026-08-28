const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../database/database');
const { formatMoney } = require('../../config/currency');

module.exports = {
  data: new SlashCommandBuilder().setName('stats').setDescription('View your economy statistics'),
  async execute(interaction) {
    const u = await getUser(interaction.user.id);
    return interaction.reply({ content: `📊 **Your Economy Stats**\n💰 Wallet: ${formatMoney(u.balance)}\n🏦 Bank: ${formatMoney(u.bank)}\n💎 Net Worth: ${formatMoney((u.balance || 0) + (u.bank || 0))}\n💼 Job: ${u.job || 'None'}\n💵 Lifetime Earned: ${formatMoney(u.lifetimeEarned || 0)}\n🧰 Work Count: ${u.workCount || 0}`, ephemeral: true });
  }
};
