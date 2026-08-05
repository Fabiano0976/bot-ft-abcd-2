const config = require('../../config.json');

function hasPermission(member) {
  return config.cargosPermitidos.some(id => member.roles.cache.has(id));
}

module.exports = { hasPermission };
