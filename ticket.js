const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { Client: PGClient } = require('pg');

// Database Connection
const connectionString = 'Postgresql://postgres:SUBgxADwgvrZSBSHQhyRbmbIzEHnSZte@tokaido.proxy.rlwy.net:10401/railway';
const pgClient = new PGClient({ connectionString, ssl: { rejectUnauthorized: false } });

pgClient.connect().then(() => console.log('🎯 Database Connected!'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

// Commands Definition
const commands = [
    new SlashCommandBuilder().setName('setup-ticket').setDescription('Setup Tickets system')
        .addChannelOption(o => o.setName('channel').setDescription('Dooro channel-ka').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('title').setDescription('Cinwaanka embed-ka').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Sharaxaadda embed-ka').setRequired(true)),
    new SlashCommandBuilder().setName('tick').setDescription('Force open a ticket')
        .addUserOption(o => o.setName('user').setDescription('Dooro user-ka').setRequired(true)),
    new SlashCommandBuilder().setName('setup-verify').setDescription('Setup verification system')
        .addChannelOption(o => o.setName('channel').setDescription('Dooro channel-ka').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('description').setDescription('Sharaxaadda').setRequired(true))
].map(c => c.toJSON());

// Ready Event
client.once('ready', async () => {
    console.log(`Bot is active: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// Interaction Event
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    await interaction.deferReply({ ephemeral: true });

    if (interaction.commandName === 'setup-ticket') {
        await interaction.editReply({ content: '✅ Nidaamkii Ticket-ka waa la diyaariyay!' });
    } else if (interaction.commandName === 'setup-verify') {
        await interaction.editReply({ content: '✅ Nidaamka Verify-ga waa la diyaariyay!' });
    } else if (interaction.commandName === 'tick') {
        await interaction.editReply({ content: '✅ Ticket-ka waa la furay!' });
    }
});

client.login(process.env.DISCORD_TOKEN);
