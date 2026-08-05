const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { hasPermission } = require('../services/permissions');
const { postOrUpdate } = require('../services/hierarchyPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postar-hierarquia')
    .setDescription('Publica ou recria a hierarquia oficial.'),

  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Você não tem permissão.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await postOrUpdate(interaction.client, interaction.guild, true);
    return interaction.editReply('✅ Hierarquia publicada.');
  }
};
