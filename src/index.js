require('dotenv').config({ override: true });

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const config = require('../config.json');
const { hasPermission } = require('./services/permissions');
const { normalizeRank, currentRank, setRank, rankName } = require('./services/hierarchy');
const { sendHierarchyLog, sendSetRefusalLog } = require('./services/logs');
const { postOrUpdate } = require('./services/hierarchyPanel');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('Preencha BOT_TOKEN no arquivo .env.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(__dirname, 'commands', file));
  client.commands.set(command.data.name, command);
}

function requestEmbed(data, status = '🟡 Aguardando aprovação', responsible = null, reason = null) {
  const color = status.includes('Aprovado') ? 0x2ecc71 : status.includes('Recusado') ? 0xe74c3c : 0xf1c40f;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('📋 Nova Solicitação de SET')
    .setDescription('**18º BPM | Força Tática ABCD**')
    .addFields(
      { name: '👤 Solicitante', value: `<@${data.userId}>`, inline: true },
      { name: '📛 Nome', value: data.name, inline: true },
      { name: '🆔 Passaporte', value: data.passport, inline: true },
      { name: '🎖️ Patente', value: data.rankText, inline: true },
      { name: '📱 Telefone', value: data.phone, inline: true },
      { name: '👮 Recrutador', value: data.recruiter, inline: true },
      { name: 'Status', value: status }
    )
    .setTimestamp();

  if (responsible) embed.addFields({ name: 'Responsável', value: `<@${responsible}>` });
  if (reason) embed.addFields({ name: 'Motivo', value: reason });

  return embed;
}

function extractRequest(embed) {
  const get = name => embed.fields.find(f => f.name === name)?.value || '';
  return {
    userId: get('👤 Solicitante').match(/\d{17,20}/)?.[0],
    name: get('📛 Nome'),
    passport: get('🆔 Passaporte'),
    rankText: get('🎖️ Patente'),
    phone: get('📱 Telefone'),
    recruiter: get('👮 Recrutador')
  };
}

client.once(Events.ClientReady, ready => {
  console.log(`✅ Bot online como ${ready.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'set:start') {
      const modal = new ModalBuilder()
        .setCustomId('set:form')
        .setTitle('Solicitação de SET');

      const fields = [
        ['name', 'Nome completo', 'Ex.: Matias Mendes'],
        ['passport', 'Passaporte', 'Ex.: 5518'],
        ['rank', 'Patente solicitada', 'Ex.: Recruta'],
        ['phone', 'Telefone in-game', 'Digite o telefone ou N/A'],
        ['recruiter', 'Quem recrutou você?', 'Ex.: Capitão Wood']
      ];

      for (const [id, label, placeholder] of fields) {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setPlaceholder(placeholder)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(80)
          )
        );
      }

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'set:form') {
      const data = {
        userId: interaction.user.id,
        name: interaction.fields.getTextInputValue('name'),
        passport: interaction.fields.getTextInputValue('passport'),
        rankText: interaction.fields.getTextInputValue('rank'),
        phone: interaction.fields.getTextInputValue('phone'),
        recruiter: interaction.fields.getTextInputValue('recruiter')
      };

      if (!normalizeRank(data.rankText)) {
        return interaction.reply({
          content: '❌ Patente inválida. Exemplo: Recruta, Soldado, Cabo, 3º Sargento, Capitão.',
          flags: MessageFlags.Ephemeral
        });
      }

      const channel = await client.channels.fetch(config.canalSolicitacoesSet).catch(() => null);
      if (!channel?.isTextBased()) {
        return interaction.reply({
          content: '❌ Canal de solicitações inválido.',
          flags: MessageFlags.Ephemeral
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`set:approve:${interaction.user.id}`)
          .setLabel('Aprovar')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`set:reject:${interaction.user.id}`)
          .setLabel('Recusar')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        embeds: [requestEmbed(data)],
        components: [row]
      });

      return interaction.reply({
        content: '✅ Solicitação enviada para o Comando.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith('set:approve:')) {
      if (!hasPermission(interaction.member)) {
        return interaction.reply({
          content: '❌ Você não tem permissão.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = interaction.customId.split(':')[2];
      const data = extractRequest(interaction.message.embeds[0]);
      const rank = normalizeRank(data.rankText);
      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (!member || !rank) {
        return interaction.reply({
          content: '❌ Membro ou patente inválida.',
          flags: MessageFlags.Ephemeral
        });
      }

      const oldRank = currentRank(member);

      // Adiciona a patente solicitada
      await setRank(member, rank);

      // Adiciona também o cargo extra de SET
      const cargoSetId = '1292344832194383987';

      if (!member.roles.cache.has(cargoSetId)) {
        await member.roles.add(cargoSetId);
      }

      await sendHierarchyLog(client, {
        memberId: userId,
        responsibleId: interaction.user.id,
        action: 'SET APROVADO',
        oldRank,
        newRank: rank,
        reason: `Solicitação aprovada. Passaporte: ${data.passport}`
      });

      await postOrUpdate(client, interaction.guild);

      await interaction.update({
        embeds: [requestEmbed(data, '🟢 Aprovado', interaction.user.id)],
        components: []
      });

      await member.send(
        `✅ Sua solicitação foi aprovada. Patente: **${rankName(rank)}**.`
      ).catch(() => {});

      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('set:reject:')) {
      if (!hasPermission(interaction.member)) {
        return interaction.reply({
          content: '❌ Você não tem permissão.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = interaction.customId.split(':')[2];

      const modal = new ModalBuilder()
        .setCustomId(`set:reject-form:${userId}:${interaction.message.id}`)
        .setTitle('Recusar solicitação')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('reason')
              .setLabel('Motivo da recusa')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(500)
          )
        );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('set:reject-form:')) {
      if (!hasPermission(interaction.member)) {
        return interaction.reply({
          content: '❌ Você não tem permissão.',
          flags: MessageFlags.Ephemeral
        });
      }

      const [, , userId, messageId] = interaction.customId.split(':');
      const reason = interaction.fields.getTextInputValue('reason');
      const channel = await client.channels.fetch(config.canalSolicitacoesSet);
      const message = await channel.messages.fetch(messageId);
      const data = extractRequest(message.embeds[0]);

      await message.edit({
        embeds: [requestEmbed(data, '🔴 Recusado', interaction.user.id, reason)],
        components: []
      });

      await sendSetRefusalLog(client, userId, interaction.user.id, reason);

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      await member?.send(`❌ Sua solicitação foi recusada. Motivo: ${reason}`).catch(() => {});

      return interaction.reply({
        content: '✅ Solicitação recusada.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error(error);

    const payload = {
      content: '❌ Ocorreu um erro. Confira as permissões e a posição do cargo do bot.',
      flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(token);
