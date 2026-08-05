const config = require('../../config.json');
const { ORDEM, NOMES } = require('../constants');

function currentRank(member) {
  return ORDEM.find(rank => member.roles.cache.has(config.cargos[rank])) || null;
}

function nextRank(rank) {
  if (!rank) return 'RECRUTA';
  const i = ORDEM.indexOf(rank);
  return i >= 0 && i < ORDEM.length - 1 ? ORDEM[i + 1] : null;
}

function previousRank(rank) {
  if (!rank) return null;
  const i = ORDEM.indexOf(rank);
  return i > 0 ? ORDEM[i - 1] : null;
}

async function setRank(member, rank) {
  const rankIds = Object.values(config.cargos);
  const toRemove = member.roles.cache.filter(role => rankIds.includes(role.id));

  if (toRemove.size) {
    await member.roles.remove(toRemove);
  }

  if (rank) {
    await member.roles.add(config.cargos[rank]);
  }
}

function rankName(rank) {
  return rank ? NOMES[rank] || rank : 'Sem patente';
}

function normalizeRank(text) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°\.\- ]/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase()
    .trim();

  const map = {
    CORONEL: 'CORONEL',
    TENENTE_CORONEL: 'TENENTE_CORONEL',
    TENENTECORONEL: 'TENENTE_CORONEL',
    MAJOR: 'MAJOR',
    CAPITAO: 'CAPITAO',
    PRIMEIRO_TENENTE: 'PRIMEIRO_TENENTE',
    '1_TENENTE': 'PRIMEIRO_TENENTE',
    SEGUNDO_TENENTE: 'SEGUNDO_TENENTE',
    '2_TENENTE': 'SEGUNDO_TENENTE',
    ASPIRANTE: 'ASPIRANTE',
    SUBTENENTE: 'SUBTENENTE',
    SUB_TENENTE: 'SUBTENENTE',
    PRIMEIRO_SARGENTO: 'PRIMEIRO_SARGENTO',
    '1_SARGENTO': 'PRIMEIRO_SARGENTO',
    SEGUNDO_SARGENTO: 'SEGUNDO_SARGENTO',
    '2_SARGENTO': 'SEGUNDO_SARGENTO',
    TERCEIRO_SARGENTO: 'TERCEIRO_SARGENTO',
    '3_SARGENTO': 'TERCEIRO_SARGENTO',
    CABO: 'CABO',
    SOLDADO: 'SOLDADO',
    RECRUTA: 'RECRUTA'
  };

  return map[normalized] || null;
}

module.exports = {
  currentRank,
  nextRank,
  previousRank,
  setRank,
  rankName,
  normalizeRank
};
