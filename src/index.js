const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder,
} = require('discord.js');
const { config, validateConfig, isOwner, isBotAdmin } = require('./config');
const { initDatabase, saveDatabase, getUser, getGuild, getLeaderboard } = require('./database');
const { JOBS, ITEMS, ACHIEVEMENTS, ensureStats, totalWealth, work, buy, sell, unlockAchievements } = require('./economy');
const { money, buildProfile } = require('./profile');

validateConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const jobChoices = Object.entries(JOBS).map(([value, job]) => ({ name: job.name, value }));
const itemChoices = Object.entries(ITEMS).map(([value, item]) => ({ name: `${item.name} — ${item.price}`, value }));

const commands = [
  new SlashCommandBuilder().setName('balance').setDescription("View your or another user's balance").addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('profile').setDescription("View an economy profile").addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  new SlashCommandBuilder().setName('pay').setDescription('Pay another user').addUserOption(o => o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('deposit').setDescription('Move coins from wallet to bank').addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('withdraw').setDescription('Move coins from bank to wallet').addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('work').setDescription('Work a job to earn coins').addStringOption(o => o.setName('job').setDescription('Choose a job').setRequired(true).addChoices(...jobChoices)),
  new SlashCommandBuilder().setName('jobs').setDescription('View available jobs'),
  new SlashCommandBuilder().setName('shop').setDescription('View the economy shop'),
  new SlashCommandBuilder().setName('buy').setDescription('Buy an item').addStringOption(o => o.setName('item').setDescription('Item').setRequired(true).addChoices(...itemChoices)).addIntegerOption(o => o.setName('quantity').setDescription('Quantity').setMinValue(1).setMaxValue(99).setRequired(false)),
  new SlashCommandBuilder().setName('sell').setDescription('Sell an item').addStringOption(o => o.setName('item').setDescription('Item').setRequired(true).addChoices(...itemChoices)).addIntegerOption(o => o.setName('quantity').setDescription('Quantity').setMinValue(1).setMaxValue(99).setRequired(false)),
  new SlashCommandBuilder().setName('inventory').setDescription('View your inventory').addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('achievements').setDescription('View economy achievements').addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Show the richest users'),
  new SlashCommandBuilder().setName('disable').setDescription('Disable bot commands in a channel (bot admin only)').addChannelOption(o => o.setName('channel').setDescription('Channel to disable').setRequired(true)),
  new SlashCommandBuilder().setName('enable').setDescription('Enable bot commands in a channel (bot admin only)').addChannelOption(o => o.setName('channel').setDescription('Channel to enable').setRequired(true)),
  new SlashCommandBuilder().setName('disabled').setDescription('List channels where bot commands are disabled'),
  new SlashCommandBuilder().setName('economy').setDescription('Bot-level economy administration')
    .addSubcommand(s => s.setName('give').setDescription('Give coins to a user').addUserOption(o => o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove coins from a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)))
    .addSubcommand(s => s.setName('set').setDescription("Set a user's wallet balance").addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('New balance').setMinValue(0).setRequired(true)))
    .addSubcommand(s => s.setName('reset').setDescription('Reset a user economy account (owner only)').addUserOption(o => o.setName('user').setDescription('User').setRequired(true))),
];

async function replyEphemeral(interaction, content) {
  if (!interaction.replied && !interaction.deferred) return interaction.reply({ content, ephemeral: true });
  return interaction.followUp({ content, ephemeral: true });
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const route = config.guildId ? Routes.applicationGuildCommands(config.clientId, config.guildId) : Routes.applicationCommands(config.clientId);
  await rest.put(route, { body: commands.map(c => c.toJSON()) });
}

client.once('ready', async () => {
  await initDatabase();
  await registerCommands();
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Bot owners configured: ${config.ownerIds.size}`);
  console.log(`Bot admins configured: ${config.adminIds.size}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!isBotAdmin(interaction.user.id) && interaction.guildId && getGuild(interaction.guildId).disabledChannels.includes(interaction.channelId)) {
    return replyEphemeral(interaction, 'Bot commands are disabled in this channel.');
  }

  try {
    const user = getUser(interaction.user.id); ensureStats(user);
    const name = interaction.commandName;

    if (name === 'balance') {
      const target = interaction.options.getUser('user') || interaction.user;
      const data = getUser(target.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${target.username}'s Balance`).setDescription(`**Wallet:** ${money(data.balance)}\n**Bank:** ${money(data.bank)}\n**Net Worth:** ${money(totalWealth(data))}`)] });
    }

    if (name === 'profile') {
      const target = interaction.options.getUser('user') || interaction.user;
      return interaction.reply({ embeds: [buildProfile(target, target)] });
    }

    if (name === 'daily') {
      const cooldown = 86_400_000;
      const remaining = cooldown - (Date.now() - (user.lastDailyAt ? Date.parse(user.lastDailyAt) : 0));
      if (remaining > 0) return replyEphemeral(interaction, `Daily reward available in about ${Math.ceil(remaining / 3_600_000)} hour(s).`);
      user.balance += config.dailyReward; user.lifetimeEarned += config.dailyReward; user.lastDailyAt = new Date().toISOString();
      const unlocked = unlockAchievements(user); await saveDatabase();
      return interaction.reply(`You claimed ${money(config.dailyReward)}!${unlocked.length ? ` 🏆 Achievement unlocked: **${unlocked.map(a => a.name).join(', ')}**` : ''}`);
    }

    if (name === 'pay') {
      const recipient = interaction.options.getUser('user', true); const amount = interaction.options.getInteger('amount', true);
      if (recipient.bot || recipient.id === interaction.user.id) return replyEphemeral(interaction, 'Choose a different human user.');
      if (user.balance < amount) return replyEphemeral(interaction, 'You do not have enough wallet balance.');
      user.balance -= amount; getUser(recipient.id).balance += amount; await saveDatabase();
      return interaction.reply(`${interaction.user} paid ${recipient} ${money(amount)}.`);
    }

    if (name === 'deposit' || name === 'withdraw') {
      const amount = interaction.options.getInteger('amount', true);
      if (name === 'deposit') { if (user.balance < amount) return replyEphemeral(interaction, 'Not enough wallet balance.'); user.balance -= amount; user.bank += amount; }
      else { if (user.bank < amount) return replyEphemeral(interaction, 'Not enough bank balance.'); user.bank -= amount; user.balance += amount; }
      await saveDatabase(); return interaction.reply(`Transaction complete. Wallet: ${money(user.balance)} | Bank: ${money(user.bank)}`);
    }

    if (name === 'work') {
      const result = await work(interaction.user.id, interaction.options.getString('job', true));
      if (!result.ok) return replyEphemeral(interaction, `You need to wait about ${Math.ceil(result.remaining / 60_000)} minute(s) before working again.`);
      return interaction.reply(`💼 You worked as a **${result.job.name}** and earned **${money(result.earned)}**!${result.unlocked.length ? ` 🏆 ${result.unlocked.map(a => a.name).join(', ')}` : ''}`);
    }

    if (name === 'jobs') {
      const description = Object.values(JOBS).map(j => `**${j.name}** — ${money(j.min)}–${money(j.max)} • ${Math.round(j.cooldown / 60_000)} min cooldown`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 Jobs').setDescription(description)] });
    }

    if (name === 'shop') {
      const description = Object.values(ITEMS).map(i => `**${i.name}** — ${money(i.price)}\n${i.description}`).join('\n\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛒 Economy Shop').setDescription(description)] });
    }

    if (name === 'buy' || name === 'sell') {
      const item = interaction.options.getString('item', true); const quantity = interaction.options.getInteger('quantity') || 1;
      const result = name === 'buy' ? buy(interaction.user.id, item, quantity) : sell(interaction.user.id, item, quantity);
      if (!result.ok) return replyEphemeral(interaction, name === 'buy' ? `You need ${money(result.total)} in your wallet.` : `You only own ${result.owned || 0} of that item.`);
      const unlocked = unlockAchievements(user); await saveDatabase();
      return interaction.reply(`${name === 'buy' ? '🛒 Bought' : '💰 Sold'} **${quantity}× ${result.item.name}** for **${money(result.total)}**.${unlocked.length ? ` 🏆 ${unlocked.map(a => a.name).join(', ')}` : ''}`);
    }

    if (name === 'inventory') {
      const target = interaction.options.getUser('user') || interaction.user; const data = getUser(target.id);
      const lines = Object.entries(data.inventory).map(([id, qty]) => `**${ITEMS[id]?.name || id}** × ${qty}`);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🎒 ${target.username}'s Inventory`).setDescription(lines.length ? lines.join('\n') : 'Inventory is empty.')] });
    }

    if (name === 'achievements') {
      const target = interaction.options.getUser('user') || interaction.user; const data = getUser(target.id);
      const lines = ACHIEVEMENTS.map(a => `${data.achievements?.includes(a.id) ? '🏆' : '🔒'} **${a.name}** — ${a.description}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🏆 ${target.username}'s Achievements`).setDescription(lines)] });
    }

    if (name === 'leaderboard') {
      const entries = getLeaderboard(10); const lines = entries.map(([id, data], i) => `${i + 1}. <@${id}> — ${money(data.balance + data.bank)}`);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Economy Leaderboard').setDescription(lines.length ? lines.join('\n') : 'No economy data yet.')] });
    }

    if (name === 'disable' || name === 'enable') {
      if (!isBotAdmin(interaction.user.id)) return replyEphemeral(interaction, 'You are not a bot admin.');
      const channel = interaction.options.getChannel('channel', true); const guildData = getGuild(interaction.guildId);
      if (name === 'disable' && !guildData.disabledChannels.includes(channel.id)) guildData.disabledChannels.push(channel.id);
      if (name === 'enable') guildData.disabledChannels = guildData.disabledChannels.filter(id => id !== channel.id);
      await saveDatabase(); return interaction.reply(`Bot commands ${name === 'disable' ? 'disabled' : 'enabled'} in ${channel}.`);
    }

    if (name === 'disabled') {
      const channels = getGuild(interaction.guildId).disabledChannels;
      return interaction.reply(channels.length ? channels.map(id => `<#${id}>`).join(', ') : 'No channels have bot commands disabled.');
    }

    if (name === 'economy') {
      if (!isBotAdmin(interaction.user.id)) return replyEphemeral(interaction, 'You are not a bot admin.');
      const sub = interaction.options.getSubcommand(); const target = interaction.options.getUser('user', true); const data = getUser(target.id);
      if (sub === 'reset') {
        if (!isOwner(interaction.user.id)) return replyEphemeral(interaction, 'This action is restricted to bot owners.');
        data.balance = config.startingBalance; data.bank = 0; data.inventory = {}; data.lastDailyAt = null; data.lifetimeEarned = 0; data.workCount = 0; data.achievements = []; await saveDatabase();
        return interaction.reply(`Reset ${target}'s economy account.`);
      }
      const amount = interaction.options.getInteger('amount', true);
      if (sub === 'give') data.balance += amount;
      if (sub === 'remove') data.balance = Math.max(0, data.balance - amount);
      if (sub === 'set') data.balance = amount;
      await saveDatabase(); return interaction.reply(`Updated ${target}'s wallet balance to ${money(data.balance)}.`);
    }
  } catch (error) {
    console.error(error);
    return replyEphemeral(interaction, 'Something went wrong while processing that command.');
  }
});

client.login(config.token);
