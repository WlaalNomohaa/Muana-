const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Client: PGClient } = require('pg');

// 1. ISKU-XIRKA DATABASE-KA RAILWAY
const connectionString = 'Postgresql://postgres:SUBgxADwgvrZSBSHQhyRbmbIzEHnSZte@tokaido.proxy.rlwy.net:10401/railway';

const pgClient = new PGClient({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

pgClient.connect()
    .then(async () => {
        console.log('🎯 Ticket Bot wuxuu ku xirmay Database-ka rasmiga ah ee Railway!');
        
        // Abuurista shaqooyinka database-ka lagama maarmaanka ah
        await pgClient.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                guild_id TEXT PRIMARY KEY,
                category_id TEXT,
                embed_title TEXT,
                embed_desc TEXT
            );
        `);

        // Shaxda lagu keydiyo rate-limitka 12-ka saac ah
        await pgClient.query(`
            CREATE TABLE IF NOT EXISTS ticket_limits (
                user_id TEXT,
                guild_id TEXT,
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, guild_id)
            );
        `);
        console.log('🔹 Dhammaan shaxdihii Database-ka waa diyaar!');
    })
    .catch(err => console.error('❌ Database error:', err));

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
    } catch (error) {
        console.error(error);
    }
    
    // Bilaabida baaritaanka Ticket-ada cidla ah (Auto-Close check every 1 minute)
    setInterval(checkIdleTickets, 60000);
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
            await pgClient.query(`
                INSERT INTO tickets (guild_id, category_id, embed_title, embed_desc)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (guild_id)
                DO UPDATE SET category_id = $2, embed_title = $3, embed_desc = $4;
            `, [guild.id, category.id, inputTitle, inputDescription]);

            const setupRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_config_modal_${ticketChannel.id}`)
                    .setLabel('Configure Menu Categories ⚙️')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({
                content: 'ℹ️ **Tallaabada xigta:** Guji badanka hoose si aad u qorto magacyada 5-ta qaybood ee aad rabto.',
                components: [setupRow],
                ephemeral: true
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Khalad ayaa dhacay marka la habaynayay Ticket-ka.', ephemeral: true });
        }
    }

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
                topic: `User-ID: ${targetUser.id} | Auto-Close Enabled`,
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

    // A. DIYAARINTA 5-TA QAYBOOD (ADMIN ONLY)
    if (interaction.isButton() && interaction.customId.startsWith('open_config_modal_')) {
        const targetChannelId = interaction.customId.replace('open_config_modal_', '');

        const modal = new ModalBuilder()
            .setCustomId(`ticket_config_modal_${targetChannelId}`)
            .setTitle('Menu Categories Setup');

        const cat1 = new TextInputBuilder().setCustomId('cat_1').setLabel('Category 1 (Required)').setStyle(TextInputStyle.Short).setRequired(true);
        const cat2 = new TextInputBuilder().setCustomId('cat_2').setLabel('Category 2 (Optional)').setStyle(TextInputStyle.Short).setRequired(false);
        const cat3 = new TextInputBuilder().setCustomId('cat_3').setLabel('Category 3 (Optional)').setStyle(TextInputStyle.Short).setRequired(false);
        const cat4 = new TextInputBuilder().setCustomId('cat_4').setLabel('Category 4 (Optional)').setStyle(TextInputStyle.Short).setRequired(false);
        const cat5 = new TextInputBuilder().setCustomId('cat_5').setLabel('Category 5 (Optional)').setStyle(TextInputStyle.Short).setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(cat1),
            new ActionRowBuilder().addComponents(cat2),
            new ActionRowBuilder().addComponents(cat3),
            new ActionRowBuilder().addComponents(cat4),
            new ActionRowBuilder().addComponents(cat5)
        );

        await interaction.showModal(modal);
    }

    // B. SAMAXAADA MENU-GA EE CHANNEL-KA RASMIGA AH
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_config_modal_')) {
        await interaction.deferReply({ ephemeral: true });
        const targetChannelId = interaction.customId.replace('ticket_config_modal_', '');
        const targetChannel = guild.channels.cache.get(targetChannelId);

        const categories = [
            interaction.fields.getTextInputValue('cat_1'),
            interaction.fields.getTextInputValue('cat_2'),
            interaction.fields.getTextInputValue('cat_3'),
            interaction.fields.getTextInputValue('cat_4'),
            interaction.fields.getTextInputValue('cat_5')
        ].filter(Boolean);

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
            await interaction.editReply({ content: '✅ Menu-gii 5-ta qaybood lahaa waa la soo diray!' });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Khalad ayaa dhacay.' });
        }
    }

    // C. MARKA USER-KU MENU-GA KA DOORTHO QAYB (12 SAAC CHECK + MODAL U FUR)
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        const selectedValue = interaction.values[0];
        const displayLabel = interaction.component.options.find(o => o.value === selectedValue).label;

        try {
            // Hubi 12 saac limit-ka
            const checkLimit = await pgClient.query(
                `SELECT opened_at FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, 
                [user.id, guild.id]
            );

            if (checkLimit.rows.length > 0) {
                const openedTime = new Date(checkLimit.rows[0].opened_at);
                const now = new Date();
                const diffMs = now - openedTime;
                const diffHours = diffMs / (1000 * 60 * 60);

                if (diffHours < 12) {
                    const remainingHours = Math.ceil(12 - diffHours);
                    return interaction.reply({ 
                        content: `❌ Waxaad furi kartaa kaliya 1 Ticket 12-kii saacba mar! Fadlan sug **${remainingHours} saacadood** oo kale.`, 
                        ephemeral: true 
                    });
                } else {
                    // Haddii 12 saac laga gudbay, tirtir xogtii hore
                    await pgClient.query(`DELETE FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [user.id, guild.id]);
                }
            }

            // U fur foomka faahfaahinta Ticket-ka (User Input Fields)
            const userModal = new ModalBuilder()
                .setCustomId(`user_ticket_details_${selectedValue}`)
                .setTitle(`Submit: ${displayLabel}`);

            const reasonInput = new TextInputBuilder()
                .setCustomId('ticket_reason')
                .setLabel('Maxaad noogu baahatay? (Reason)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Fadlan halkan ku qor faahfaahinta caawinaada aad u baahan tahay...');

            const rulesInput = new TextInputBuilder()
                .setCustomId('ticket_rules')
                .setLabel('Xeerarka ma akhrisay? (Haa/Maya)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Haa');

            userModal.addComponents(
                new ActionRowBuilder().addComponents(reasonInput),
                new ActionRowBuilder().addComponents(rulesInput)
            );

            await interaction.showModal(userModal);
        } catch (err) {
            console.error(err);
        }
    }

    // D. MARKA USER-KU SOO SUBMIT-GAREEYO FOOMKA TICKET-KA (CHANNEL CUSUB AYAAN GEYNAYNAA)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('user_ticket_details_')) {
        await interaction.deferReply({ ephemeral: true });
        const selectedValue = interaction.customId.replace('user_ticket_details_', '');
        
        const userReason = interaction.fields.getTextInputValue('ticket_reason');
        const userRules = interaction.fields.getTextInputValue('ticket_rules');

        try {
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            const categoryId = res.rows[0].category_id;
            const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '-');

            // Abuurista Private Channel (Admins iyo User kaliya)
            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                topic: `User-ID: ${user.id} | Auto-Close Enabled`,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            // U keydi limit-ka 12 saac
            await pgClient.query(
                `INSERT INTO ticket_limits (user_id, guild_id) VALUES ($1, $2) ON CONFLICT (user_id, guild_id) DO UPDATE SET opened_at = CURRENT_TIMESTAMP`, 
                [user.id, guild.id]
            );

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('Close Ticket 🔒').setStyle(ButtonStyle.Danger)
            );

            const infoEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket Cusub oo la furay`)
                .setDescription(`👋 Ku soo dhawaada qaybta Taageerada, ${user}! \n\n**Xeerarka Ma Akhrisay?:** ${userRules}`)
                .addFields({ name: '📝 Faahfaahinta dhibaatada:', value: userReason })
                .setColor('#5865F2')
                .setTimestamp();

            await privateChannel.send({
                content: `||${user}||`,
                embeds: [infoEmbed],
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Si guul leh ayaa Ticket-kaagii loo sameeyay: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad intii channel-ka la abuurayay.' });
        }
    }

    // E. BADANKA XIRITAANKA (ADMIN ONLY)
    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Kaliya Maamulayaasha (Admins) ayaa xiri kara ticket-ka!', ephemeral: true });
        }
        await interaction.reply({ content: '🔒 Ticket-kan waa la xirayaa 5 ilbiriqsi gudahood...' });
        
        // Kahor intaan la tirtirin channel-ka, ka saar user-ka xannibaadda 12 saac haddii admin-ku xiro (ikhiyaari)
        try {
            const topic = channel.topic || '';
            const match = topic.match(/User-ID:\s*(\d+)/);
            if (match) {
                const userId = match[1];
                await pgClient.query(`DELETE FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [userId, guild.id]);
            }
        } catch (e) { console.error(e); }

        setTimeout(async () => {
            try { await channel.delete(); } catch (err) { console.error(err); }
        }, 5000);
    }
});

// 5. SHAQADA AUTO-CLOSE-KA (5 HOURS IDLE CHECK)
async function checkIdleTickets() {
    client.guilds.cache.forEach(async (guild) => {
        try {
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            if (res.rows.length === 0) return;
            
            const categoryId = res.rows[0].category_id;
            const category = guild.channels.cache.get(categoryId);
            if (!category) return;

            // Soo qaado dhammaan text channels-ka ku dhex jira category-gaas
            const channels = guild.channels.cache.filter(c => c.parentId === categoryId && c.type === ChannelType.GuildText);
            
            channels.forEach(async (chan) => {
                try {
                    const messages = await chan.messages.fetch({ limit: 1 });
                    const lastMsg = messages.first();
                    
                    if (lastMsg) {
                        const lastMsgTime = lastMsg.createdAt;
                        const now = new Date();
                        const diffMs = now - lastMsgTime;
                        const diffHours = diffMs / (1000 * 60 * 60);

                        // Haddii 5 saacadood cidna ka hadli waydo (Idle)
                        if (diffHours >= 5) {
                            console.log(`⚠️ Auto-Deleting Idle Ticket: ${chan.name}`);
                            await chan.send({ content: '⏰ **Auto-Close:** Maadaama aan wax fariin ah laga soo dirin channel-kan 5-tii saac ee la soo dhaafay, si toos ah ayaa loo xirayaa...' });
                            
                            // Ka saar rate limitka qofka iska lahaa ticketka mar guud
                            const topic = chan.topic || '';
                            const match = topic.match(/User-ID:\s*(\d+)/);
                            if (match) {
                                await pgClient.query(`DELETE FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [match[1], guild.id]);
                            }

                            setTimeout(async () => {
                                try { await chan.delete(); } catch (err) {}
                
