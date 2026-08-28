const { SlashCommandBuilder } = require('discord.js');
const { getTransactions } = require('../../economy/transactions');
const { formatMoney } = require('../../config/currency');

module.exports = {
  data: new SlashCommandBuilder().setName('transactions').setDescription('View your recent economy transactions'),
  async execute(interaction) {
    const rows = await getTransactions(interaction.user.id, 10);
    if (!rows.length) return interaction.reply({ content: '📜 No transactions found.', ephemeral: true });
    const lines = rows.map(t => `${t.type === 'credit' ? '🟢' : '🔴'} ${t.reason || 'Transaction'} — ${formatMoney(Math.abs(t.amount))}`);
    return interaction.reply({ content: `📜 **Recent Transactions**\n${lines.join('\n')}`, ephemeral: true });
  }
};
