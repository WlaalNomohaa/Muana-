const {
    Client: DiscordClient,
    GatewayIntentBits,
    ActivityType,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { Pool } = require('pg');

// ================== 1. DATABASE (POSTGRESQL) ==================
const connectionString = process.env.DATABASE_URL;

const pgClient = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pgClient.on('error', (err) => {
    console.error('⚠️ Khalad lama filaan ah oo ka yimid Postgres Pool (waa la maareeyay):', err.message);
});

pgClient.connect()
    .then((c) => {
        c.release();
        console.log('🎯 Database Connected!');
        return pgClient.query(`
            CREATE TABLE IF NOT EXISTS ticket_config (
                guild_id TEXT PRIMARY KEY,
                panel_channel_id TEXT,
                panel_message TEXT,
                button_label TEXT,
                open_message TEXT,
                mention_role_id TEXT,
                category_id TEXT,
                log_channel_id TEXT,
                ticket_counter INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS tickets (
                channel_id TEXT PRIMARY KEY,
                guild_id TEXT,
                opener_id TEXT,
                claimed_by TEXT,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
    })
    .then(() => console.log('✅ Tables-kii database-ka waa ay diyaar yihiin!'))
    .catch(err => console.error('❌ Khalad ayaa dhacay marka lala xiriirayay Postgres:', err));

// ================== 2. DISCORD CLIENT ==================
const client = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: ['Channel']
});

// ================== COLORS & EMBED HELPER ==================
const COLORS = {
    success: 0x57F287,
    error: 0xED4245,
    warning: 0xFEE75C,
    info: 0x5865F2,
    brand: 0x8E5CFF
};
const FOOTER = { text: 'Ticket System 🎫' };

const makeEmbed = ({ color = COLORS.brand, title, description, fields, thumbnail } = {}) => {
    const embed = new EmbedBuilder().setColor(color).setFooter(FOOTER).setTimestamp();
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (fields) embed.addFields(fields);
    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
};

// ================== SLASH COMMANDS ==================
const commands = [
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Diyaari Nidaamka Ticket-ka server-kan (Admins Only).')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel-ka lagu dhigayo Panel-ka')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Farriinta ku qoran Panel-ka (waxa la arki doono)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('button_text')
                .setDescription('Qoraalka Button-ka (Tusaale: Open Ticket)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('open_message')
                .setDescription('Farriinta la diro marka Channel-ka Ticket-ka la furo. Isticmaal {user}')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('mention_role')
                .setDescription('Role-ka la mention gareynayo marka ticket la furo (Tusaale: @Administrator)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Category-ga tickets-ku ku samaysmi doonaan (ikhtiyaari)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption(option =>
            option.setName('log_channel')
                .setDescription('Channel-ka logs-ka tickets-ka (ikhtiyaari)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)),

    new SlashCommandBuilder()
        .setName('close-ticket')
        .setDescription('Xir ticket-ka aad hadda ku jirto (Admins Only).'),

    new SlashCommandBuilder()
        .setName('add-ticket')
        .setDescription('Ku dar xubin ticket-ka aad hadda ku jirto (Admins Only).')
        .addUserOption(option => option.setName('user').setDescription('Xubinta la darayo').setRequired(true)),

    new SlashCommandBuilder()
        .setName('remove-ticket')
        .setDescription('Ka saar xubin ticket-ka aad hadda ku jirto (Admins Only).')
        .addUserOption(option => option.setName('user').setDescription('Xubinta laga saarayo').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Hubi in bot-ku shaqeynayo iyo latency-giisa.')
].map(command => command.toJSON());

// ================== PANEL & BUTTON ROWS ==================
const getPanelRow = (buttonLabel) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_ticket')
            .setLabel(buttonLabel || 'Open Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
    );
};

const getTicketRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('Claim')
            .setEmoji('🙋')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );
};

// ================== READY ==================
client.once('ready', async () => {
    console.log(`Bot-ka Muana 🚩#7831 wuu shaqaynayaa!`);
    client.user.setActivity('Tickets 🎫', { type: ActivityType.Watching });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Bilaabaya diiwaangelinta amarrada...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Dhammaan amarrada si guul leh ayaa loo galiyay! 🔥');
    } catch (error) {
        console.error(error);
    }
});

// ================== HELPER: hubi in qofku Admin yahay ==================
const isAdmin = (member) => member.permissions.has(PermissionFlagsBits.Administrator);

// ================== INTERACTIONS ==================
client.on('interactionCreate', async interaction => {

    // ---------- SLASH COMMANDS ----------
    if (interaction.isChatInputCommand()) {
        const { commandName, guild, member } = interaction;

        // --- /ping ---
        if (commandName === 'ping') {
            return interaction.reply({
                embeds: [makeEmbed({ color: COLORS.info, description: `🏓 Pong! Latency: **${Date.now() - interaction.createdTimestamp}ms** | API: **${Math.round(client.ws.ping)}ms**` })],
                ephemeral: true
            });
        }

        // --- /setup-ticket ---
        if (commandName === 'setup-ticket') {
            if (!isAdmin(member)) {
                return interaction.reply({
                    embeds: [makeEmbed({ color: COLORS.error, description: '❌ Kaliya Maamulayaasha ayaa isticmaali kara amarkan.' })],
                    ephemeral: true
                });
            }

            const panelChannel = interaction.options.getChannel('channel');
            const panelMessage = interaction.options.getString('message');
            const buttonLabel = interaction.options.getString('button_text');
            const openMessage = interaction.options.getString('open_message');
            const mentionRole = interaction.options.getRole('mention_role');
            const category = interaction.options.getChannel('category');
            const logChannel = interaction.options.getChannel('log_channel');

            try {
                await pgClient.query(`
                    INSERT INTO ticket_config (guild_id, panel_channel_id, panel_message, button_label, open_message, mention_role_id, category_id, log_channel_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (guild_id)
                    DO UPDATE SET panel_channel_id = $2, panel_message = $3, button_label = $4, open_message = $5, mention_role_id = $6, category_id = $7, log_channel_id = $8;
                `, [guild.id, panelChannel.id, panelMessage, buttonLabel, openMessage, mentionRole.id, category ? category.id : null, logChannel ? logChannel.id : null]);

                const panelEmbed = makeEmbed({
                    color: COLORS.brand,
                    title: '🎫 Support Tickets',
                    description: panelMessage
                }).setThumbnail(guild.iconURL());

                await panelChannel.send({ embeds: [panelEmbed], components: [getPanelRow(buttonLabel)] });

                await interaction.reply({
                    embeds: [makeEmbed({
                        color: COLORS.success,
                        description: `✅ Nidaamka Ticket-ka si guul leh ayaa loo diyaariyay!\nPanel-ka wuxuu ku yaalaa ${panelChannel}.`
                    })],
                    ephemeral: true
                });
            } catch (err) {
                console.error(err);
                await interaction.reply({
                    embeds: [makeEmbed({ color: COLORS.error, description: '❌ Khalad ayaa dhacay marka nidaamka la diyaarinayay.' })],
                    ephemeral: true
                });
            }
            return;
        }

        // --- /close-ticket ---
        if (commandName === 'close-ticket') {
            return closeTicket(interaction);
        }

        // --- /add-ticket ---
        if (commandName === 'add-ticket') {
            if (!isAdmin(member)) {
                return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Kaliya Maamulayaasha ayaa isticmaali kara amarkan.' })], ephemeral: true });
            }
            const targetUser = interaction.options.getUser('user');
            try {
                const ticketRes = await pgClient.query('SELECT * FROM tickets WHERE channel_id = $1', [interaction.channel.id]);
                if (ticketRes.rows.length === 0) {
                    return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Channel-kani maaha ticket.' })], ephemeral: true });
                }
                await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                    ViewChannel: true, SendMessages: true, ReadMessageHistory: true
                });
                await interaction.reply({ embeds: [makeEmbed({ color: COLORS.success, description: `✅ ${targetUser} waa lagu daray ticket-kan.` })] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Khalad ayaa dhacay.' })], ephemeral: true });
            }
            return;
        }

        // --- /remove-ticket ---
        if (commandName === 'remove-ticket') {
            if (!isAdmin(member)) {
                return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Kaliya Maamulayaasha ayaa isticmaali kara amarkan.' })], ephemeral: true });
            }
            const targetUser = interaction.options.getUser('user');
            try {
                const ticketRes = await pgClient.query('SELECT * FROM tickets WHERE channel_id = $1', [interaction.channel.id]);
                if (ticketRes.rows.length === 0) {
                    return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Channel-kani maaha ticket.' })], ephemeral: true });
                }
                await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                    ViewChannel: false, SendMessages: false, ReadMessageHistory: false
                });
                await interaction.reply({ embeds: [makeEmbed({ color: COLORS.warning, description: `🚫 ${targetUser} waa laga saaray ticket-kan.` })] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Khalad ayaa dhacay.' })], ephemeral: true });
            }
            return;
        }
    }

    // ---------- BUTTONS ----------
    if (interaction.isButton()) {

        // --- Open Ticket ---
        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true });
            const { guild, user } = interaction;

            try {
                const cfgRes = await pgClient.query('SELECT * FROM ticket_config WHERE guild_id = $1', [guild.id]);
                if (cfgRes.rows.length === 0) {
                    return interaction.editReply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Nidaamka Ticket-ka wali lama diyaarin. Fadlan admin-ku ha isticmaalo /setup-ticket.' })] });
                }
                const cfg = cfgRes.rows[0];

                const existing = await pgClient.query(
                    `SELECT channel_id FROM tickets WHERE guild_id = $1 AND opener_id = $2 AND status = 'open'`,
                    [guild.id, user.id]
                );
                if (existing.rows.length > 0) {
                    return interaction.editReply({
                        embeds: [makeEmbed({ color: COLORS.warning, description: `⚠️ Ticket ayaad hore u furatay: <#${existing.rows[0].channel_id}>` })]
                    });
                }

                const counterRes = await pgClient.query(
                    'UPDATE ticket_config SET ticket_counter = ticket_counter + 1 WHERE guild_id = $1 RETURNING ticket_counter',
                    [guild.id]
                );
                const ticketNumber = String(counterRes.rows[0].ticket_counter).padStart(4, '0');

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${ticketNumber}`,
                    type: ChannelType.GuildText,
                    parent: cfg.category_id || null,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: cfg.mention_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                    ]
                });

                await pgClient.query(
                    'INSERT INTO tickets (channel_id, guild_id, opener_id, status) VALUES ($1, $2, $3, $4)',
                    [ticketChannel.id, guild.id, user.id, 'open']
                );

                const openMsg = (cfg.open_message || 'Hi {user}! Mahadsanid inaad soo gaadhay Support-ka.')
                    .replace(/{user}/g, `${user}`);

                const welcomeEmbed = makeEmbed({
                    color: COLORS.brand,
                    title: `🎫 Ticket #${ticketNumber}`,
                    description: openMsg
                }).setThumbnail(user.displayAvatarURL());

                await ticketChannel.send({
                    content: `${user} • <@&${cfg.mention_role_id}>`,
                    embeds: [welcomeEmbed],
                    components: [getTicketRow()]
                });

                await interaction.editReply({
                    embeds: [makeEmbed({ color: COLORS.success, description: `✅ Ticket-kaaga waa la furay: ${ticketChannel}` })]
                });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Khalad ayaa dhacay marka ticket-ka la furayay.' })] });
            }
            return;
        }

        // --- Claim Ticket ---
        if (interaction.customId === 'claim_ticket') {
            if (!isAdmin(interaction.member)) {
                return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Kaliya Maamulayaasha ayaa ticket-yada claim gareyn kara.' })], ephemeral: true });
            }
            try {
                await pgClient.query('UPDATE tickets SET claimed_by = $1 WHERE channel_id = $2', [interaction.user.id, interaction.channel.id]);
                await interaction.reply({
                    embeds: [makeEmbed({ color: COLORS.success, description: `🙋 Ticket-kan waxaa claim gareeyay ${interaction.user}.` })]
                });
            } catch (err) {
                console.error(err);
                await interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Khalad ayaa dhacay.' })], ephemeral: true });
            }
            return;
        }

        // --- Close Ticket ---
        if (interaction.customId === 'close_ticket') {
            return closeTicket(interaction);
        }
    }
});

// ================== CLOSE TICKET LOGIC (Admins Only) ==================
async function closeTicket(interaction) {
    const channel = interaction.channel;

    if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Kaliya Maamulayaasha ayaa xiri kara ticket-yada.' })], ephemeral: true });
    }

    try {
        const ticketRes = await pgClient.query('SELECT * FROM tickets WHERE channel_id = $1', [channel.id]);
        if (ticketRes.rows.length === 0) {
            return interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Channel-kani maaha ticket.' })], ephemeral: true });
        }
        const ticket = ticketRes.rows[0];

        const cfgRes = await pgClient.query('SELECT log_channel_id FROM ticket_config WHERE guild_id = $1', [interaction.guild.id]);
        const cfg = cfgRes.rows[0];

        await pgClient.query('UPDATE tickets SET status = $1 WHERE channel_id = $2', ['closed', channel.id]);

        await interaction.reply({
            embeds: [makeEmbed({ color: COLORS.warning, description: `🔒 Ticket-kan waxaa xiray ${interaction.user}. Channel-ka wuxuu si otomaatig ah u tirmi doonaa **5 ilbiriqsi** gudahood.` })]
        });

        if (cfg?.log_channel_id) {
            const logChannel = await interaction.guild.channels.fetch(cfg.log_channel_id).catch(() => null);
            if (logChannel) {
                await logChannel.send({
                    embeds: [makeEmbed({
                        color: COLORS.info,
                        title: '📁 Ticket Closed',
                        fields: [
                            { name: 'Ticket', value: channel.name, inline: true },
                            { name: 'Opener', value: `<@${ticket.opener_id}>`, inline: true },
                            { name: 'Closed By', value: `${interaction.user}`, inline: true }
                        ]
                    })]
                });
            }
        }

        setTimeout(() => channel.delete().catch(() => null), 5000);
    } catch (err) {
        console.error(err);
        await interaction.reply({ embeds: [makeEmbed({ color: COLORS.error, description: '❌ Khalad ayaa dhacay marka ticket-ka la xirayay.' })], ephemeral: true });
    }
}

// ================== PROCESS SAFETY ==================
process.on('unhandledRejection', (err) => {
    console.error('⚠️ Unhandled Rejection (waa la maareeyay):', err);
});
process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception (waa la maareeyay):', err);
});

client.login(process.env.DISCORD_TOKEN);
