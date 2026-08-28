const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { config, validateConfig, isOwner, isBotAdmin } = require('./config');
const { initDatabase, saveDatabase, getUser, getGuild } = require('./database');

validateConfig();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('View your or another user\'s balance')
    .addUserOption((option) => option.setName('user').setDescription('User to check').setRequired(false)),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),

  new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay another user')
    .addUserOption((option) => option.setName('user').setDescription('Recipient').setRequired(true))
    .addIntegerOption((option) => option.setName('amount').setDescription('Amount to pay').setMinValue(1).setRequired(true)),

  new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Move coins from wallet to bank')
    .addIntegerOption((option) => option.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),

  new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Move coins from bank to wallet')
    .addIntegerOption((option) => option.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the richest users'),

  new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Disable bot commands in a channel (bot admin only)')
    .addChannelOption((option) => option.setName('channel').setDescription('Channel to disable').setRequired(true)),

  new SlashCommandBuilder()
    .setName('enable')
    .setDescription('Enable bot commands in a channel (bot admin only)')
    .addChannelOption((option) => option.setName('channel').setDescription('Channel to enable').setRequired(true)),

  new SlashCommandBuilder()
    .setName('disabled')
    .setDescription('List channels where bot commands are disabled'),

  new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Bot-level economy administration')
    .addSubcommand((sub) => sub
      .setName('give')
      .setDescription('Give coins to a user')
      .addUserOption((option) => option.setName('user').setDescription('Recipient').setRequired(true))
      .addIntegerOption((option) => option.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('remove')
      .setDescription('Remove coins from a user')
      .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption((option) => option.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('set')
      .setDescription('Set a user\'s wallet balance')
      .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption((option) => option.setName('amount').setDescription('New balance').setMinValue(0).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('reset')
      .setDescription('Reset a user economy account (owner only)')
      .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))),
];

function money(amount) {
  return `${config.currencySymbol} ${amount.toLocaleString('en-IN')} ${config.currencyName}`;
}

function adminOnly(interaction) {
  if (isBotAdmin(interaction.user.id)) return true;
  interaction.reply({ content: 'You are not a bot admin.', ephemeral: true });
  return false;
}

function ownerOnly(interaction) {
  if (isOwner(interaction.user.id)) return true;
  interaction.reply({ content: 'This action is restricted to bot owners.', ephemeral: true });
  return false;
}

function channelDisabled(interaction) {
  if (!interaction.guildId) return false;
  return getGuild(interaction.guildId).disabledChannels.includes(interaction.channelId);
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);
  await rest.put(route, { body: commands.map((command) => command.toJSON()) });
}

client.once('ready', async () => {
  await initDatabase();
  await registerCommands();
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Bot owners configured: ${config.ownerIds.size}`);
  console.log(`Bot admins configured: ${config.adminIds.size}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Discord Administrator/server-owner status is intentionally NOT checked here.
  // Only BOT_OWNER_IDS and BOT_ADMIN_IDS from .env grant bot-level privileges.
  if (channelDisabled(interaction) && !isBotAdmin(interaction.user.id)) {
    return interaction.reply({ content: 'Bot commands are disabled in this channel.', ephemeral: true });
  }

  try {
    const user = getUser(interaction.user.id);

    if (interaction.commandName === 'balance') {
      const target = interaction.options.getUser('user') || interaction.user;
      const targetData = getUser(target.id);
      const embed = new EmbedBuilder()
        .setTitle(`${target.username}'s Balance`)
        .setDescription(`**Wallet:** ${money(targetData.balance)}\n**Bank:** ${money(targetData.bank)}`);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'daily') {
      const cooldown = 24 * 60 * 60 * 1000;
      const last = user.lastDailyAt ? Date.parse(user.lastDailyAt) : 0;
      const remaining = cooldown - (Date.now() - last);
      if (remaining > 0) {
        const hours = Math.ceil(remaining / (60 * 60 * 1000));
        return interaction.reply({ content: `Your daily reward is on cooldown. Try again in about ${hours} hour(s).`, ephemeral: true });
      }
      user.balance += config.dailyReward;
      user.lastDailyAt = new Date().toISOString();
      await saveDatabase();
      return interaction.reply(`You claimed ${money(config.dailyReward)}!`);
    }

    if (interaction.commandName === 'pay') {
      const recipient = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      if (recipient.bot || recipient.id === interaction.user.id) return interaction.reply({ content: 'Choose a different human user.', ephemeral: true });
      if (user.balance < amount) return interaction.reply({ content: 'You do not have enough wallet balance.', ephemeral: true });
      user.balance -= amount;
      getUser(recipient.id).balance += amount;
      await saveDatabase();
      return interaction.reply(`${interaction.user} paid ${recipient} ${money(amount)}.`);
    }

    if (interaction.commandName === 'deposit' || interaction.commandName === 'withdraw') {
      const amount = interaction.options.getInteger('amount', true);
      if (interaction.commandName === 'deposit') {
        if (user.balance < amount) return interaction.reply({ content: 'Not enough wallet balance.', ephemeral: true });
        user.balance -= amount;
        user.bank += amount;
      } else {
        if (user.bank < amount) return interaction.reply({ content: 'Not enough bank balance.', ephemeral: true });
        user.bank -= amount;
        user.balance += amount;
      }
      await saveDatabase();
      return interaction.reply(`Transaction complete. Wallet: ${money(user.balance)} | Bank: ${money(user.bank)}`);
    }

    if (interaction.commandName === 'leaderboard') {
      const entries = Object.entries(require('./database').__getRaw?.() || {}).sort((a, b) => b[1].balance - a[1].balance).slice(0, 10);
      if (!entries.length) return interaction.reply('No economy data yet.');
      return interaction.reply('Leaderboard is being expanded in the next module.');
    }

    if (interaction.commandName === 'disable') {
      if (!adminOnly(interaction)) return;
      const channel = interaction.options.getChannel('channel', true);
      const guildData = getGuild(interaction.guildId);
      if (!guildData.disabledChannels.includes(channel.id)) guildData.disabledChannels.push(channel.id);
      await saveDatabase();
      return interaction.reply(`Bot commands disabled in ${channel}.`);
    }

    if (interaction.commandName === 'enable') {
      if (!adminOnly(interaction)) return;
      const channel = interaction.options.getChannel('channel', true);
      const guildData = getGuild(interaction.guildId);
      guildData.disabledChannels = guildData.disabledChannels.filter((id) => id !== channel.id);
      await saveDatabase();
      return interaction.reply(`Bot commands enabled in ${channel}.`);
    }

    if (interaction.commandName === 'disabled') {
      const guildData = getGuild(interaction.guildId);
      if (!guildData.disabledChannels.length) return interaction.reply('No channels have bot commands disabled.');
      return interaction.reply(guildData.disabledChannels.map((id) => `<#${id}>`).join(', '));
    }

    if (interaction.commandName === 'economy') {
      if (!adminOnly(interaction)) return;
      const sub = interaction.options.getSubcommand();
      const target = interaction.options.getUser('user', true);
      const targetData = getUser(target.id);

      if (sub === 'reset') {
        if (!ownerOnly(interaction)) return;
        targetData.balance = config.startingBalance;
        targetData.bank = 0;
        targetData.inventory = {};
        targetData.lastDailyAt = null;
        await saveDatabase();
        return interaction.reply(`Reset ${target}'s economy account.`);
      }

      const amount = interaction.options.getInteger('amount');
      if (sub === 'give') targetData.balance += amount;
      if (sub === 'remove') targetData.balance = Math.max(0, targetData.balance - amount);
      if (sub === 'set') targetData.balance = amount;
      await saveDatabase();
      return interaction.reply(`Updated ${target}'s wallet balance to ${money(targetData.balance)}.`);
    }
  } catch (error) {
    console.error(error);
    const response = { content: 'Something went wrong while processing that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) return interaction.followUp(response);
    return interaction.reply(response);
  }
});

client.login(config.token);
