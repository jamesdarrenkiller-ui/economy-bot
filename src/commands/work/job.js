const { SlashCommandBuilder } = require('discord.js');
const { JOBS } = require('../../data/jobs');
const { getUser, saveUser } = require('../../database/database');

module.exports = {
  data: new SlashCommandBuilder().setName('job').setDescription('Choose a job').addStringOption(o => o.setName('name').setDescription('Job name').setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    const name = interaction.options.getString('name', true).toLowerCase();
    const job = JOBS[name];
    if (!job) return interaction.reply({ content: '❌ That job does not exist.', ephemeral: true });
    const user = await getUser(interaction.user.id);
    user.job = name;
    await saveUser(user);
    return interaction.reply(`💼 Your job is now **${job.name}**.`);
  }
};
