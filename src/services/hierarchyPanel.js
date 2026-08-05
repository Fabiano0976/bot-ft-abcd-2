const config = require('../../config.json');
const { NOMES } = require('../constants');
const { readState, writeState } = require('../utils/state');

const groups = [
  ['👑 OFICIAIS SUPERIORES', ['CORONEL', 'TENENTE_CORONEL', 'MAJOR']],
  ['⭐ OFICIAIS INTERMEDIÁRIOS', ['CAPITAO']],
  ['🎖️ OFICIAIS SUBALTERNOS', ['PRIMEIRO_TENENTE', 'SEGUNDO_TENENTE', 'ASPIRANTE']],
  ['🛡️ GRADUADOS', ['SUBTENENTE', 'PRIMEIRO_SARGENTO', 'SEGUNDO_SARGENTO', 'TERCEIRO_SARGENTO', 'CABO']],
  ['👮 PRAÇAS', ['SOLDADO', 'RECRUTA']]
];

async function buildText(guild) {
  await guild.members.fetch();

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '          FORÇA TÁTICA',
    '       HIERARQUIA OFICIAL',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ''
  ];

  for (let i = 0; i < groups.length; i++) {
    const [title, ranks] = groups[i];
    lines.push(title, '');

    for (const rank of ranks) {
      const role = guild.roles.cache.get(config.cargos[rank]);
      const members = role
        ? [...role.members.values()]
            .filter(m => !m.user.bot)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        : [];

      lines.push(NOMES[rank]);

      if (members.length) {
        members.forEach(member => lines.push(`• <@${member.id}>`));
      } else {
        lines.push('• Vago');
      }

      lines.push('');
    }

    if (i < groups.length - 1) {
      lines.push('━━━━━━━━━━━━━━━━━━━━', '');
    }
  }

  lines.push(
    '━━━━━━━━━━━━━━━━━━━━',
    'Última atualização:',
    `<t:${Math.floor(Date.now() / 1000)}:f>`
  );

  return lines.join('\n');
}

async function postOrUpdate(client, guild, forceNew = false) {
  const channel = await client.channels.fetch(config.canalHierarquia).catch(() => null);
  if (!channel?.isTextBased()) throw new Error('Canal de hierarquia inválido.');

  const state = readState();
  const content = await buildText(guild);

  if (!forceNew && state.hierarchyMessageId) {
    const message = await channel.messages.fetch(state.hierarchyMessageId).catch(() => null);
    if (message) {
      await message.edit({ content, allowedMentions: { parse: [] } });
      return message;
    }
  }

  const message = await channel.send({ content, allowedMentions: { parse: [] } });
  writeState({ ...state, hierarchyMessageId: message.id });
  return message;
}

module.exports = { postOrUpdate };
