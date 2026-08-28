const { EmbedBuilder } = require('discord.js');
const { formatMoney } = require('./config/currency');
const { getUser } = require('./database/database');

function buildProfile(discordUser) {
  const data = getUser(discordUser.id);
  return new EmbedBuilder().setTitle(`${discordUser.displayName}'s Profile`)
    .setThumbnail(discordUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '💰 Wallet', value: formatMoney(data.balance), inline: true },
      { name: '🏦 Bank', value: formatMoney(data.bank), inline: true },
      { name: '📊 Net Worth', value: formatMoney(data.balance + data.bank), inline: true },
      { name: '💼 Job', value: data.job || 'Unemployed', inline: true },
      { name: '💵 Lifetime Earned', value: formatMoney(data.lifetimeEarned || 0), inline: true },
      { name: '🏆 Achievements', value: String((data.achievements || []).length), inline: true }
    ).setFooter({ text: 'Peso Economy' });
}
module.exports = { buildProfile };
