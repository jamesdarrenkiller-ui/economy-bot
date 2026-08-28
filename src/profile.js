const { EmbedBuilder } = require('discord.js');
const { config } = require('./config');
const { getUser } = require('./database');
const { totalWealth } = require('./economy');

function money(amount) { return `${config.currencySymbol} ${amount.toLocaleString('en-IN')} ${config.currencyName}`; }

function buildProfile(user, discordUser) {
  const data = getUser(user.id);
  const achievements = data.achievements?.length || 0;
  return new EmbedBuilder()
    .setTitle(`${discordUser.displayName}'s Profile`)
    .setThumbnail(discordUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '💰 Wallet', value: money(data.balance), inline: true },
      { name: '🏦 Bank', value: money(data.bank), inline: true },
      { name: '📊 Net Worth', value: money(totalWealth(data)), inline: true },
      { name: '💼 Job', value: data.job || 'Unemployed', inline: true },
      { name: '💵 Lifetime Earned', value: money(data.lifetimeEarned || 0), inline: true },
      { name: '🏆 Achievements', value: `${achievements}`, inline: true },
    )
    .setFooter({ text: 'Economy Profile' });
}

module.exports = { money, buildProfile };
