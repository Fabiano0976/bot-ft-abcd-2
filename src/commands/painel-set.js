const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');

const config = require('../../config.json');
const { hasPermission } = require('../services/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-set')
    .setDescription('Publica o painel de solicitação de SET.'),

  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Você não tem permissão.', flags: MessageFlags.Ephemeral });
    }

    const channel = await interaction.client.channels.fetch(config.canalPainelSet).catch(() => null);
    if (!channel?.isTextBased()) {
      return interaction.reply({ content: '❌ Canal do painel inválido.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(0x1f4e79)
      .setTitle('👮 18º BPM | Força Tática ABCD')
      .setDescription([
        '**SOLICITAÇÃO DE SET**',
        '',
        'Caso você tenha sido recrutado e ainda não tenha recebido seu cargo, clique no botão abaixo.',
        '',
        '📋 Preencha todas as informações corretamente.',
        '⚠️ A solicitação será analisada pelo Comando.'
      ].join('\n'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('set:start')
        .setLabel('Iniciar Solicitação')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      content: `✅ Painel publicado em <#${config.canalPainelSet}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
