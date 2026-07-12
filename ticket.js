const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { Client: PGClient } = require('pg');

// 1. ISKU-XIRKA DATABASE-KA CUSUB EE RAILWAY
const connectionString = 'Postgresql://postgres:SUBgxADwgvrZSBSHQhyRbmbIzEHnSZte@tokaido.proxy.rlwy.net:10401/railway';

const pgClient = new PGClient({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

pgClient.connect()
    .then(() => {
        console.log('🎯 Ticket Bot wuxuu ku xirmay Database-ka rasmiga ah ee Railway!');
        return pgClient.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                guild_id TEXT PRIMARY KEY,
                category_id TEXT
            );
        `);
    })
    .then(() => console.log('✅ Table-kii Tickets-ka waa diyaar!'))
    .catch(err => console.error('❌ Database-ka waa laga waayey isku-xirka:', err));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 2. Diyaarinta amarrada
const commands = [
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Ku dhex sameey nidaamka Ticket-ka menu doorasho leh (Admins Only).')
        .addChannelOption(option => option.setName('channel').setDescription('Channel-ka la dhigayo menu-ka Ticket-ka').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option => option.setName('category').setDescription('Category-ga ay ku dhex furmayaan ticket-ada').setRequired(true).addChannelTypes(ChannelType.GuildCategory)),

    new SlashCommandBuilder()
        .setName('tick')
        .setDescription('Si toos ah ugu fur Ticket xubin gaar ah (Admins Only).')
        .addUserOption(option => option.setName('user').setDescription('Dooro xubinta aad u furayso Ticket-ka').setRequired(true))
].map(command => command.toJSON());

// 3. Markii Bot-ku uu online soo galo
client.once('ready', async () => {
    console.log(`🎫 Muana- 🚩 waa diyaar! ${client.user.tag}`);
    client.user.setActivity('Tikidhada & Taageerada', { type: ActivityType.Listening });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Bilaabaya diiwaangelinta amarrada...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Dhammaan amarrada si guul leh ayaa loo galiyay! 🔥');
    } catch (error) {
        console.error(error);
    }
});

// 4. Ka jawaabista Slash Commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild, member } = interaction;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ **Ma haysatid oggolaansho!** Kaliya Maamulayaasha ayaa isticmaali kara amarradan.', ephemeral: true });
    }

    // --- /setup-ticket ---
    if (commandName === 'setup-ticket') {
        const ticketChannel = interaction.options.getChannel('channel');
        const category = interaction.options.getChannel('category');

        try {
            await pgClient.query(`
                INSERT INTO tickets (guild_id, category_id)
                VALUES ($1, $2)
                ON CONFLICT (guild_id)
                DO UPDATE SET category_id = $2;
            `, [guild.id, category.id]);

            // Dhisidda Qoraalka Embed-ka (Sida sawirka koowaad)
            const embed = new EmbedBuilder()
                .setTitle('Enginerious | Support')
                .setDescription('**Guidelines:**\n\n🔹 Refrain from opening multiple tickets.\n🔹 Refrain from pinging staff unnecessarily.\n🔹 Any Ticket left empty or inactive will be closed.')
                .setColor('#2b2d31');

            // Dhisidda Menu-ka Doorashada (Sida sawirka labaad)
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_menu')
                .setPlaceholder('Select your Support Ticket')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('General Question').setDescription('We help you on General questions.').setValue('general').setEmoji('👥'),
                    new StringSelectMenuOptionBuilder().setLabel('Engine Issues').setDescription('We help you on related Engine issues.').setValue('engine').setEmoji('⚙️'),
                    new StringSelectMenuOptionBuilder().setLabel('Reseller Apply').setDescription('Apply for an official Enginerious Reseller.').setValue('reseller').setEmoji('💙'),
                    new StringSelectMenuOptionBuilder().setLabel('Media Apply').setDescription('Apply for an official Enginerious Media guy.').setValue('media').setEmoji('📸'),
                    new StringSelectMenuOptionBuilder().setLabel('Shop Order').setDescription('Shop Order related question / help.').setValue('shop').setEmoji('🛒'),
                    new StringSelectMenuOptionBuilder().setLabel('Design Purchase').setDescription('Design Purchase').setValue('design').setEmoji('⭐')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await ticketChannel.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({ content: `✅ Nidaamka Ticket-ka ee Menu-ga leh waxaa lagu diyaariyey channel-ka ${ticketChannel}!`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Khalad ayaa dhacay marka la habaynayay Ticket-ka.', ephemeral: true });
        }
    }

    // --- /tick ---
    if (commandName === 'tick') {
        await interaction.deferReply({ ephemeral: true });
        const targetUser = interaction.options.getUser('user');

        try {
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            if (res.rows.length === 0) {
                return interaction.editReply({ content: '❌ Nidaamka Ticket-ka ee server-kan wali lama qaabayn. Samee `/setup-ticket`.' });
            }

            const categoryId = res.rows[0].category_id;
            const channelName = `ticket-${targetUser.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            const existingChannel = guild.channels.cache.find(c => c.name === channelName && c.parentId === categoryId);
            if (existingChannel) {
                return interaction.editReply({ content: `ℹ️ Xubintan horey waxay u leedahay Ticket furan: ${existingChannel}` });
            }

            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: targetUser.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('Close Ticket 🔒').setStyle(ButtonStyle.Danger)
            );

            await privateChannel.send({
                content: `👋 Ku soo dhawaada qaybta Taageerada, ${targetUser}!\n\nMaamulaha ${interaction.user} ayaa si toos ah kuugu furay Ticket-kan gaarka ah.`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Si guul leh ayaa Ticket loogu furay qofka **${targetUser.tag}**: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad marka la furayay Ticket-ka.' });
        }
    }
});

// 5. QABASHADA DOORASHADA MENU-KA (SELECT MENU) IYO BADAMADA
client.on('interactionCreate', async interaction => {
    const { guild, user, channel } = interaction;

    // A. MARKA QOFKU MENU-KA WAX KA DOORTHO
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        await interaction.deferReply({ ephemeral: true });
        const selectedValue = interaction.values[0]; // Nooca ticket-ka uu doortay (general, engine, etc.)

        try {
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            if (res.rows.length === 0) return interaction.editReply({ content: '❌ Nidaamka Ticket-ka lama helin.' });

            const categoryId = res.rows[0].category_id;
            const channelName = `${selectedValue}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            const existingChannel = guild.channels.cache.find(c => c.name === channelName && c.parentId === categoryId);
            if (existingChannel) {
                return interaction.editReply({ content: `ℹ️ Horey waxaad u leedahay Ticket furan oo noocan ah: ${existingChannel}` });
            }

            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('Close Ticket 🔒').setStyle(ButtonStyle.Danger)
            );

            // Farriin u gaar ah nooca uu doortay
            await privateChannel.send({
                content: `👋 Ku soo dhawaada qaybta **${selectedValue.toUpperCase()} SUPPORT**, ${user}!\n\nFadlan halkan ku qor faahfaahinta caawinaada aad u baahan tahay, maamulkuna dhowaan ayuu kuu jawaabi doonaa.`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Ticket-kaagii si guul leh ayaa loo abuuray: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad marka la furayay Ticket-ka.' });
        }
    }

    // B. MARKA TICKET-KA LA XIRAYO
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Kaliya Maamulayaasha (Admins) ayaa xiri kara ticket-ka!', ephemeral: true });
        }

        await interaction.reply({ content: '🔒 Ticket-kan waa la xirayaa 5 ilbiriqsi gudahood...' });

        setTimeout(async () => {
            try { await channel.delete(); } catch (err) { console.error(err); }
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
