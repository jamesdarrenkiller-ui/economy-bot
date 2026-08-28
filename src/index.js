const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const { config, validateConfig, isOwner, isBotAdmin } = require('./config');
const { initDatabase, saveDatabase, getUser, getGuild, getLeaderboard } = require('./database');

validateConfig();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder().setName('balance').setDescription("View your or another user's balance").addUserOption((o) => o.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  new SlashCommandBuilder().setName('pay').setDescription('Pay another user').addUserOption((o) => o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption((o) => o.setName('amount').setDescription('Amount to pay').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('deposit').setDescription('Move coins from wallet to bank').addIntegerOption((o) => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('withdraw').setDescription('Move coins from bank to wallet').addIntegerOption((o) => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Show the richest users'),
  new SlashCommandBuilder().setName('disable').setDescription('Disable bot commands in a channel (bot admin only)').addChannelOption((o) => o.setName('channel').setDescription('Channel to disable').setRequired(true)),
  new SlashCommandBuilder().setName('enable').setDescription('Enable bot commands in a channel (bot admin only)').addChannelOption((o) => o.setName('channel').setDescription('Channel to enable').setRequired(true)),
  new SlashCommandBuilder().setName('disabled').setDescription('List channels where bot commands are disabled'),
  new SlashCommandBuilder().setName('economy').setDescription('Bot-level economy administration')
    .addSubcommand((s) => s.setName('give').setDescription('Give coins to a user').addUserOption((o) => o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption((o) => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Remove coins from a user').addUserOption((o) => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption((o) => o.setName('amount').setDescription('Amount').setMinValue(1).setRequired(true)))
    .addSubcommand((s) => s.setName('set').setDescription("Set a user's wallet balance").addUserOption((o) => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption((o) => o.setName('amount').setDescription('New balance').setMinValue(0).setRequired(true)))
    .addSubcommand((s) => s.setName('reset').setDescription('Reset a user economy account (owner only)').addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))),
];

const money = (amount) => `${config.currencySymbol} ${amount.toLocaleString('en-IN')} ${config.currencyName}`;

async function replyPermission(interaction, message) {
  if (interaction.replied) return;
  await interaction.reply({ content: message, ephemeral: true });
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const route = config.guildId ? Routes.applicationGuildCommands(config.clientId, config.guildId) : Routes.applicationCommands(config.clientId);
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

  // Server Owner / Administrator permissions intentionally have NO bot-level effect.
  // Only IDs from BOT_OWNER_IDS / BOT_ADMIN_IDS in .env receive privileged access.
  if (!isBotAdmin(interaction.user.id) && interaction.guildId) {
    const disabled = getGuild(interaction.guildId).disabledChannels.includes(interaction.channelId);
    if (disabled) return replyPermission(interaction, 'Bot commands are disabled in this channel.');
  }

  try {
    const user = getUser(interaction.user.id);

    if (interaction.commandName === 'balance') {
      const target = interaction.options.getUser('user') || interaction.user;
      const data = getUser(target.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${target.username}'s Balance`).setDescription(`**Wallet:** ${money(data.balance)}\n**Bank:** ${money(data.bank)}\n**Total:** ${money(data.balance + data.bank)}`)] });
    }

    if (interaction.commandName === 'daily') {
      const cooldown = 86_400_000;
      const last = user.lastDailyAt ? Date.parse(user.lastDailyAt) : 0;
      const remaining = cooldown - (Date.now() - last);
      if (remaining > 0) return replyPermission(interaction, `Your daily reward is on cooldown. Try again in about ${Math.ceil(remaining / 3_600_000)} hour(s).`);
      user.balance += config.dailyReward;
      user.lastDailyAt = new Date().toISOString();
      await saveDatabase();
      return interaction.reply(`You claimed ${money(config.dailyReward)}!`);
    }

    if (interaction.commandName === 'pay') {
      const recipient = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      if (recipient.bot || recipient.id === interaction.user.id) return replyPermission(interaction, 'Choose a different human user.');
      if (user.balance < amount) return replyPermission(interaction, 'You do not have enough wallet balance.');
      user.balance -= amount;
      getUser(recipient.id).balance += amount;
      await saveDatabase();
      return interaction.reply(`${interaction.user} paid ${recipient} ${money(amount)}.`);
    }

    if (interaction.commandName === 'deposit' || interaction.commandName === 'withdraw') {
      const amount = interaction.options.getInteger('amount', true);
      if (interaction.commandName === 'deposit') {
        if (user.balance < amount) return replyPermission(interaction, 'Not enough wallet balance.');
        user.balance -= amount;
        user.bank += amount;
      } else {
        if (user.bank < amount) return replyPermission(interaction, 'Not enough bank balance.');
        user.bank -= amount;
        user.balance += amount;
      }
      await saveDatabase();
      return interaction.reply(`Transaction complete. Wallet: ${money(user.balance)} | Bank: ${money(user.bank)}`);
    }

    if (interaction.commandName === 'leaderboard') {
      const entries = getLeaderboard(10);
      if (!entries.length) return interaction.reply('No economy data yet.');
      const lines = entries.map(([id, data], index) => `${index + 1}. <@${id}> — ${money(data.balance + data.bank)}`);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Economy Leaderboard').setDescription(lines.join('\n'))] });
    }

    if (interaction.commandName === 'disable' || interaction.commandName === 'enable') {
      if (!isBotAdmin(interaction.user.id)) return replyPermission(interaction, 'You are not a bot admin.');
      const channel = interaction.options.getChannel('channel', true);
      const guildData = getGuild(interaction.guildId);
      if (interaction.commandName === 'disable') {
        if (!guildData.disabledChannels.includes(channel.id)) guildData.disabledChannels.push(channel.id);
        await saveDatabase();
        return interaction.reply(`Bot commands disabled in ${channel}.`);
      }
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
      if (!isBotAdmin(interaction.user.id)) return replyPermission(interaction, 'You are not a bot admin.');
      const sub = interaction.options.getSubcommand();
      const target = interaction.options.getUser('user', true);
      const targetData = getUser(target.id);
      if (sub === 'reset') {
        if (!isOwner(interaction.user.id)) return replyPermission(interaction, 'This action is restricted to bot owners.');
        targetData.balance = config.startingBalance;
        targetData.bank = 0;
        targetData.inventory = {};
        targetData.lastDailyAt = null;
        await saveDatabase();
        return interaction.reply(`Reset ${target}'s economy account.`);
      }
      const amount = interaction.options.getInteger('amount', true);
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
