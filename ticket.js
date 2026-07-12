const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Client: PGClient } = require('pg');

// 1. ISKU-XIRKA DATABASE-KA RAILWAY
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
                category_id TEXT,
                embed_title TEXT,
                embed_desc TEXT
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
        .addChannelOption(option => option.setName('category').setDescription('Category-ga ay ku dhex furmayaan ticket-ada').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
        .addStringOption(option => option.setName('title').setDescription('Qor cinwaanka sare ee Embed-ka').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Qor xeerarka ama qoraalka hoose ee Embed-ka').setRequired(true)),

    new SlashCommandBuilder()
        .setName('tick')
        .setDescription('Si toos ah ugu fur Ticket xubin gaar ah (Admins Only).')
        .addUserOption(option => option.setName('user').setDescription('Dooro xubinta aad u furayso Ticket-ka').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`🎫 Muana- 🚩 waa diyaar! ${client.user.tag}`);
    client.user.setActivity('Tikidhada & Taageerada', { type: ActivityType.Listening });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Dhammaan amarrada si guul leh ayaa loo galiyay! 🔥');
    } catch (error) {
        console.error(error);
    }
});

// 3. Qabashada amarrada /setup-ticket iyo /tick
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guild, member } = interaction;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Kaliya Maamulayaasha ayaa isticmaali kara amarradan.', ephemeral: true });
    }

    if (commandName === 'setup-ticket') {
        const ticketChannel = interaction.options.getChannel('channel');
        const category = interaction.options.getChannel('category');
        const inputTitle = interaction.options.getString('title');
        const inputDescription = interaction.options.getString('description');

        try {
            // Ku kaydi xogta database-ka si loo isticmaalo marka foomka la buuxiyo
            await pgClient.query(`
                INSERT INTO tickets (guild_id, category_id, embed_title, embed_desc)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (guild_id)
                DO UPDATE SET category_id = $2, embed_title = $3, embed_desc = $4;
            `, [guild.id, category.id, inputTitle, inputDescription]);

            // U soo saar badanka qaabaynta qaybaha menu-ka
            const setupRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_config_modal_${ticketChannel.id}`)
                    .setLabel('Configure Menu Categories ⚙️')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({
                content: 'ℹ️ **Tallaabada xigta:** Guji badanka hoose si aad u qorto magacyada qaybaha aad rabaan in menu-ka lagu soo bandhigo.',
                components: [setupRow],
                ephemeral: true
            });
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
            if (res.rows.length === 0) return interaction.editReply({ content: '❌ Nidaamka Ticket-ka wali lama qaabayn.' });

            const categoryId = res.rows[0].category_id;
            const channelName = `ticket-${targetUser.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

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
                content: `👋 Ku soo dhawaada qaybta Taageerada, ${targetUser}!\n\nMaamulaha ${interaction.user} ayaa kuu furay tikidhkan.`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Si guul leh ayaa Ticket loogu furay: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad.' });
        }
    }
});

// 4. Maareynta Badamada, Modal-ka, iyo Xulashada Menu-ga
client.on('interactionCreate', async interaction => {
    const { guild, user, channel } = interaction;

    // A. MARKA ADMIN-KU RIIXO "Configure Menu Categories"
    if (interaction.isButton() && interaction.customId.startsWith('open_config_modal_')) {
        const targetChannelId = interaction.customId.replace('open_config_modal_', '');

        const modal = new ModalBuilder()
            .setCustomId(`ticket_config_modal_${targetChannelId}`)
            .setTitle('Menu Categories Setup');

        // Ku dar sanduuqyo ay ku qoraan qaybaha (Kaliya xaddid 5 qaybood)
        const cat1 = new TextInputBuilder().setCustomId('cat_1').setLabel('Category 1 (Tusaale: General Question)').setStyle(TextInputStyle.Short).setRequired(true);
        const cat2 = new TextInputBuilder().setCustomId('cat_2').setLabel('Category 2 (Tusaale: Engine Issues)').setStyle(TextInputStyle.Short).setRequired(false);
        const cat3 = new TextInputBuilder().setCustomId('cat_3').setLabel('Category 3 (Tusaale: Reseller Apply)').setStyle(TextInputStyle.Short).setRequired(false);
        const cat4 = new TextInputBuilder().setCustomId('cat_4').setLabel('Category 4 (Tusaale: Shop Order)').setStyle(TextInputStyle.Short).setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(cat1),
            new ActionRowBuilder().addComponents(cat2),
            new ActionRowBuilder().addComponents(cat3),
            new ActionRowBuilder().addComponents(cat4)
        );

        await interaction.showModal(modal);
    }

    // B. MARKA ADMIN-KU BUUXIYO FOOMKA (MODAL SUBMIT)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_config_modal_')) {
        await interaction.deferReply({ ephemeral: true });
        const targetChannelId = interaction.customId.replace('ticket_config_modal_', '');
        const targetChannel = guild.channels.cache.get(targetChannelId);

        const categories = [
            interaction.fields.getTextInputValue('cat_1'),
            interaction.fields.getTextInputValue('cat_2'),
            interaction.fields.getTextInputValue('cat_3'),
            interaction.fields.getTextInputValue('cat_4')
        ].filter(Boolean); // Meelihii marnaa iska reeb

        try {
            const res = await pgClient.query('SELECT embed_title, embed_desc FROM tickets WHERE guild_id = $1', [guild.id]);
            const embedTitle = res.rows[0]?.embed_title || 'Support';
            const embedDesc = res.rows[0]?.embed_desc || 'Select an option below';

            const embed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setDescription(embedDesc.replace(/\\n/g, '\n'))
                .setColor('#2b2d31');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_menu')
                .setPlaceholder('Select your Support Ticket');

            // Ku dhis menu-ga wixii uu Admin-ku soo qoray
            categories.forEach((cat, index) => {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat)
                        .setDescription(`Open a ticket for ${cat}`)
                        .setValue(`cat_${index}_${cat.toLowerCase().replace(/[^a-z0-9]/g, '')}`)
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: '✅ Menu-gii waa la dhisay oo lagu tuuray channel-ka!' });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Khalad ayaa dhacay xilligii menu-ga la abuurayay.' });
        }
    }

    // C. MARKA USER-KU WAX KA DOORTO MENU-KA CUSTOM-KA AH
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        await interaction.deferReply({ ephemeral: true });
        const selectedValue = interaction.values[0];
        const displayLabel = interaction.component.options.find(o => o.value === selectedValue).label;

        try {
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            const categoryId = res.rows[0].category_id;
            const channelName = `${displayLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${user.username}`.toLowerCase();

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

            await privateChannel.send({
                content: `👋 Ku soo dhawaada qaybta **${displayLabel}**, ${user}!\n\nFadlan halkan ku qor faahfaahinta caawinaada aad u baahan tahay.`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Ticket-kaagii si guul leh ayaa loo abuuray: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad marka la furayay Ticket-ka.' });
        }
    }

    // D. BUTTON CLOSE TICKET
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Kaliya Maamulayaasha ayaa xiri kara ticket-ka!', ephemeral: true });
        }
        await interaction.reply({ content: '🔒 Ticket-kan waa la xirayaa 5 ilbiriqsi gudahood...' });
        setTimeout(async () => {
            try { await channel.delete(); } catch (err) { console.error(err); }
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
