const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { hasPermission } = require('../services/permissions');
const { currentRank, nextRank, previousRank, setRank, rankName } = require('../services/hierarchy');
const { sendHierarchyLog } = require('../services/logs');
const { postOrUpdate } = require('../services/hierarchyPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promover')
    .setDescription('Promove um militar para a próxima patente.')
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

    const newRank = nextRank(oldRank);
    if (!newRank) {
      return interaction.reply({ content: '⚠️ Esse militar já está na patente máxima.', flags: MessageFlags.Ephemeral });
    }

    await setRank(member, newRank);
    await sendHierarchyLog(interaction.client, {
      memberId: user.id,
      responsibleId: interaction.user.id,
      action: 'PROMOVIDO',
      oldRank,
      newRank,
      reason
    });
    await postOrUpdate(interaction.client, interaction.guild);

    return interaction.reply({
      content: `✅ ${user} foi promovido de **${rankName(oldRank)}** para **${rankName(newRank)}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
