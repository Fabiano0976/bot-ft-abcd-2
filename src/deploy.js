require('dotenv').config({ override: true });

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const config = require('../config.json');

const token = process.env.BOT_TOKEN;
const applicationId = process.env.APPLICATION_ID;

if (!token || !applicationId) {
  console.error('Preencha BOT_TOKEN e APPLICATION_ID no arquivo .env.');
  process.exit(1);
}

if (!/^\d{17,20}$/.test(applicationId)) {
  console.error('APPLICATION_ID precisa conter somente números.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Registrando ${commands.length} comandos...`);
    await rest.put(
      Routes.applicationGuildCommands(applicationId, config.guildId),
      { body: commands }
    );
    console.log('✅ Comandos registrados com sucesso.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
