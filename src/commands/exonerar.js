const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { hasPermission } = require('../services/permissions');
const { currentRank, nextRank, previousRank, setRank, rankName } = require('../services/hierarchy');
const { sendHierarchyLog } = require('../services/logs');
const { postOrUpdate } = require('../services/hierarchyPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exonerar')
    .setDescription('Remove a patente de um militar.')
    .addUserOption(o => o.setName('membro').setDescription('Militar').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Você não tem permissão.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('membro', true);
    const reason = interaction.options.getString('motivo', true);
    const member = await interaction.guild.members.fetch(user.id);
    const oldRank = currentRank(member);

    if (!oldRank) {
      return interaction.reply({ content: '⚠️ Esse militar não possui patente.', flags: MessageFlags.Ephemeral });
    }

    await setRank(member, null);
    await sendHierarchyLog(interaction.client, {
      memberId: user.id,
      responsibleId: interaction.user.id,
      action: 'EXONERADO',
      oldRank,
      newRank: null,
      reason
    });
    await postOrUpdate(interaction.client, interaction.guild);

    return interaction.reply({
      content: `✅ ${user} foi exonerado.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
