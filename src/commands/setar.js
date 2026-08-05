const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { hasPermission } = require('../services/permissions');
const { ORDEM, NOMES } = require('../constants');
const { currentRank, setRank, rankName } = require('../services/hierarchy');
const { sendHierarchyLog } = require('../services/logs');
const { postOrUpdate } = require('../services/hierarchyPanel');

const builder = new SlashCommandBuilder()
  .setName('setar')
  .setDescription('Define diretamente a patente de um militar.')
  .addUserOption(o => o.setName('membro').setDescription('Militar').setRequired(true))
  .addStringOption(o => {
    o.setName('patente').setDescription('Nova patente').setRequired(true);
    ORDEM.forEach(rank => o.addChoices({ name: NOMES[rank], value: rank }));
    return o;
  })
  .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true));

module.exports = {
  data: builder,

  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Você não tem permissão.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('membro', true);
    const newRank = interaction.options.getString('patente', true);
    const reason = interaction.options.getString('motivo', true);
    const member = await interaction.guild.members.fetch(user.id);
    const oldRank = currentRank(member);

    await setRank(member, newRank);
    await sendHierarchyLog(interaction.client, {
      memberId: user.id,
      responsibleId: interaction.user.id,
      action: 'PATENTE ALTERADA',
      oldRank,
      newRank,
      reason
    });
    await postOrUpdate(interaction.client, interaction.guild);

    return interaction.reply({
      content: `✅ ${user} agora é **${rankName(newRank)}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
