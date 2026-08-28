const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { JOBS } = require('../../data/jobs');

module.exports = {
  data: new SlashCommandBuilder().setName('jobs').setDescription('View available jobs'),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle('💼 Available Jobs').setDescription(Object.values(JOBS).map(j => `**${j.name}**\n${j.description}\n💰 ${j.min}-${j.max} Peso`).join('\n\n'));
    return interaction.reply({ embeds: [embed] });
  }
};
