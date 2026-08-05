const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', '..', 'data', 'state.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readState, writeState };
