const { REST, Routes } = require('discord.js');
require('dotenv').config();
const { clientId, guildId } = require('./config.json');
const token = process.env.DISCORD_TOKEN;
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`🔄 Registrazione di ${commands.length} comandi slash...`);
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log(`✅ Registrati con successo ${data.length} comandi slash!`);
    } catch (error) {
        console.error(error);
    }
})();
