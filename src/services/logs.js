const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { rankName } = require('./hierarchy');

async function sendHierarchyLog(client, data) {
  const channel = await client.channels.fetch(config.canalLogs).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x1f4e79)
    .setTitle('📋 Registro de Hierarquia')
    .addFields(
      { name: 'Militar', value: `<@${data.memberId}>`, inline: true },
      { name: 'Ação', value: data.action, inline: true },
      { name: 'Responsável', value: `<@${data.responsibleId}>`, inline: true },
      { name: 'Patente anterior', value: rankName(data.oldRank), inline: true },
      { name: 'Nova patente', value: rankName(data.newRank), inline: true },
      { name: 'Motivo', value: data.reason }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function sendSetRefusalLog(client, userId, responsibleId, reason) {
  const channel = await client.channels.fetch(config.canalLogs).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('❌ Solicitação de SET recusada')
    .addFields(
      { name: 'Solicitante', value: `<@${userId}>`, inline: true },
      { name: 'Responsável', value: `<@${responsibleId}>`, inline: true },
      { name: 'Motivo', value: reason }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = { sendHierarchyLog, sendSetRefusalLog };
