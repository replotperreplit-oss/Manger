const { Client, GatewayIntentBits, Collection, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { clientId, guildId, messaggioSerale } = require('./config.json');
const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando caricato: ${command.data.name}`);
    } else {
        console.warn(`⚠️ Il comando ${filePath} manca di "data" o "execute".`);
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ Nessun comando trovato: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true });
        }
    }
});

client.once('ready', () => {
    console.log(`✅ Bot online come ${client.user.tag}`);

    let messaggioInviato = false;

    setInterval(() => {
        const ora = new Date();
        const oraItaliana = new Date(ora.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        const hh = oraItaliana.getHours();
        const mm = oraItaliana.getMinutes();

        if (hh === messaggioSerale.ora && mm === 0) {
            if (!messaggioInviato) {
                messaggioInviato = true;
                const canale = client.channels.cache.get(messaggioSerale.canaleId);
                if (canale) {
                    const embed = new EmbedBuilder()
                        .setTitle(messaggioSerale.titolo)
                        .setDescription(messaggioSerale.descrizione)
                        .setColor(messaggioSerale.colore)
                        .setFooter({ text: messaggioSerale.footer });
                    canale.send({ embeds: [embed] }).catch(console.error);
                    console.log(`✅ Messaggio serale inviato alle ${hh}:00`);
                } else {
                    console.warn(`⚠️ Canale serale non trovato: ${messaggioSerale.canaleId}`);
                }
            }
        } else {
            messaggioInviato = false;
        }
    }, 60000);
});

async function registraComandi() {
    const comandi = [];
    const cmdFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of cmdFiles) {
        const command = require(path.join(commandsPath, file));
        if ('data' in command) comandi.push(command.data.toJSON());
    }
    const rest = new REST().setToken(token);
    try {
        console.log(`🔄 Registrazione di ${comandi.length} comandi slash...`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: comandi });
        console.log(`✅ Comandi slash registrati con successo!`);
    } catch (error) {
        console.error('❌ Errore nella registrazione dei comandi:', error);
    }
}

registraComandi().then(() => client.login(token));
