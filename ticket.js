const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Client: PGClient } = require('pg');

const connectionString = 'Postgresql://postgres:SUBgxADwgvrZSBSHQhyRbmbIzEHnSZte@tokaido.proxy.rlwy.net:10401/railway';
const pgClient = new PGClient({ connectionString: connectionString, ssl: { rejectUnauthorized: false } });

pgClient.connect().then(async () => {
    console.log('🎯 Database Connected!');
    await pgClient.query(`CREATE TABLE IF NOT EXISTS tickets (guild_id TEXT PRIMARY KEY, embed_title TEXT, embed_desc TEXT);`);
    await pgClient.query(`CREATE TABLE IF NOT EXISTS ticket_limits (user_id TEXT, guild_id TEXT, opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, guild_id));`);
    await pgClient.query(`CREATE TABLE IF NOT EXISTS verify_setups (guild_id TEXT PRIMARY KEY, embed_desc TEXT);`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

const commands = [
    new SlashCommandBuilder().setName('setup-ticket').setDescription('Setup Tickets').addChannelOption(o => o.setName('channel').setRequired(true).addChannelTypes(ChannelType.GuildText)).addStringOption(o => o.setName('title').setRequired(true)).addStringOption(o => o.setName('description').setRequired(true)),
    new SlashCommandBuilder().setName('tick').setDescription('Force Open Ticket').addUserOption(o => o.setName('user').setRequired(true)),
    new SlashCommandBuilder().setName('setup-verify').setDescription('Setup Verify').addChannelOption(o => o.setName('channel').setRequired(true).addChannelTypes(ChannelType.GuildText)).addStringOption(o => o.setName('description').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`Bot is active: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    setInterval(checkIdleTickets, 60000);
});

client.on('interactionCreate', async interaction => {
    const { guild, user, channel, member } = interaction;
    if (!guild) return;
    
    // (Halkan waa meesha ay ka bilaabmaan logic-ga amarrada, Button-ka, iyo Modal-ka...)
              // ... (Qaybta 1aad ayaa halkaan kaga dhamaanaysa, Qaybta 2aadna way ka sii soconaysaa)
    
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        await interaction.deferReply({ ephemeral: true });
        const selectedValue = interaction.values[0];
        const displayLabel = interaction.component.options.find(o => o.value === selectedValue).label;

        try {
            const checkLimit = await pgClient.query(`SELECT opened_at FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [user.id, guild.id]);
            if (checkLimit.rows.length > 0) {
                const diffHours = (new Date() - new Date(checkLimit.rows[0].opened_at)) / (1000 * 60 * 60);
                if (diffHours < 12) return interaction.editReply({ content: `❌ Sug ${Math.ceil(12 - diffHours)} saacadood.` });
                await pgClient.query(`DELETE FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [user.id, guild.id]);
            }

            const privateChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            await pgClient.query(`INSERT INTO ticket_limits (user_id, guild_id) VALUES ($1, $2)`, [user.id, guild.id]);
            await privateChannel.send({ content: `👋 ${user}, Welcome!` });
            await interaction.editReply({ content: `✅ Ticket: ${privateChannel}` });
        } catch (err) { console.error(err); }
    }
});

async function checkIdleTickets() {
    client.guilds.cache.forEach(async (guild) => {
        const channels = guild.channels.cache.filter(c => c.name.startsWith('ticket-') && c.type === ChannelType.GuildText);
        channels.forEach(async (chan) => {
            const lastMsg = (await chan.messages.fetch({ limit: 1 })).first();
            if (lastMsg && (new Date() - lastMsg.createdAt) / (1000 * 60 * 60) >= 5) {
                await chan.delete().catch(() => {});
            }
        });
    });
}

client.login(process.env.DISCORD_TOKEN);
