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
        
        await pgClient.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                guild_id TEXT PRIMARY KEY,
                embed_title TEXT,
                embed_desc TEXT
            );
        `);

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

// 2. Diyaarinta amarrada (Halkan waxaa laga saaray category-gii)
const commands = [
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Ku dhex sameey nidaamka Ticket-ka menu doorasho leh (Admins Only).')
        .addChannelOption(option => option.setName('channel').setDescription('Channel-ka la dhigayo menu-ka Ticket-ka').setRequired(true).addChannelTypes(ChannelType.GuildText))
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
        const inputTitle = interaction.options.getString('title');
        const inputDescription = interaction.options.getString('description');

        try {
            await pgClient.query(`
                INSERT INTO tickets (guild_id, embed_title, embed_desc)
                VALUES ($1, $2, $3)
                ON CONFLICT (guild_id)
                DO UPDATE SET embed_title = $2, embed_desc = $3;
            `, [guild.id, inputTitle, inputDescription]);

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
            const channelName = `ticket-${targetUser.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: `User-ID: ${targetUser.id} | Auto-Close Enabled`,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: targetUser.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: guild.roles.premiumSubscriber || guild.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] } // Tusaale maamulayaasha kale
                ]
            });

            // Sii ogolaansho cid kasta oo leh Administrator permission
            guild.roles.cache.forEach(role => {
                if (role.permissions.has(PermissionFlagsBits.Administrator)) {
                    privateChannel.permissionOverwrites.create(role.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    }).catch(() => {});
                }
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('Close Ticket 🔒').setStyle(ButtonStyle.Danger)
            );

            await privateChannel.send({
                content: `👋 Ku soo dhawaada qaybta Taageerada, ${targetUser}! \n\nMaamulayaasha (Admins) halkan ayay idinku caawin doonaan dhowaan.`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Si guul leh ayaa Ticket loogu furay: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad.' });
        }
    }
});

// 4. Maareynta Badamada iyo Xulashada Menu-ga (Toos u fur Ticket-ka)
client.on('interactionCreate', async interaction => {
    const { guild, user, channel } = interaction;

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

    // C. MARKA USER-KU DOORANAYO QAYB (TOOS AYUU TICKET-KU U FURMAYA HADDA!)
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        await interaction.deferReply({ ephemeral: true });
        const selectedValue = interaction.values[0];
        const displayLabel = interaction.component.options.find(o => o.value === selectedValue).label;

        try {
            // 12 Saac Rate-limit Check
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
                    return interaction.editReply({ 
                        content: `❌ Waxaad furi kartaa kaliya 1 Ticket 12-kii saacba mar! Fadlan sug **${remainingHours} saacadood** oo kale.`
                    });
                } else {
                    await pgClient.query(`DELETE FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [user.id, guild.id]);
                }
            }

            const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '-');

            // Abuurista Private Channel (Admins iyo User kaliya)
            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: `User-ID: ${user.id} | Auto-Close Enabled`,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            // Sii ogolaansho Admin kasta oo server-ka jooga si uu u arko
            guild.roles.cache.forEach(role => {
                if (role.permissions.has(PermissionFlagsBits.Administrator)) {
                    privateChannel.permissionOverwrites.create(role.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    }).catch(() => {});
                }
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
                .setTitle(`🎫 Ticket Qaybta: ${displayLabel}`)
                .setDescription(`👋 Ku soo dhawaada qaybta Taageerada, ${user}! \n\nFadlan halkan ku qor dhibaatada ama su'aasha aad qabto si ay kuugu caawiyaan Maamulayaasha.`)
                .setColor('#2b2d31')
                .setTimestamp();

            // Qoraal haboon oo lagu mention garaynayo Admins iyo User-ka rasmiga ah
            await privateChannel.send({
                content: `||${user}|| 🔔 **Attention Admins!** Ticket cusub ayaa loo furay qaybta **${displayLabel}**.`,
                embeds: [infoEmbed],
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Si guul leh ayaa Ticket-kaagii loogu furay: ${privateChannel}` });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad intii channel-ka la abuurayay.' });
        }
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Kaliya Maamulayaasha (Admins) ayaa xiri kara ticket-ka!', ephemeral: true });
        }
        await interaction.reply({ content: '🔒 Ticket-kan waa la xirayaa 5 ilbiriqsi gudahood...' });
        
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
            // Halkan wuxuu baarayaa dhammaan ticket channels-ka magacoodu ku bilaawdo "ticket-"
            const channels = guild.channels.cache.filter(c => c.name.startsWith('ticket-') && c.type === ChannelType.GuildText);
            
            channels.forEach(async (chan) => {
                try {
                    const messages = await chan.messages.fetch({ limit: 1 });
                    const lastMsg = messages.first();
                    
                    if (lastMsg) {
                        const lastMsgTime = lastMsg.createdAt;
                        const now = new Date();
                        const diffMs = now - lastMsgTime;
                        const diffHours = diffMs / (1000 * 60 * 60);

                        if (diffHours >= 5) {
                            console.log(`⚠️ Auto-Deleting Idle Ticket: ${chan.name}`);
                            await chan.send({ content: '⏰ **Auto-Close:** Maadaama aan wax fariin ah laga soo dirin channel-kan 5-tii saac ee la soo dhaafay, si toos ah ayaa loo xirayaa...' });
                            
                            const topic = chan.topic || '';
                            const match = topic.match(/User-ID:\s*(\d+)/);
                            if (match) {
                                await pgClient.query(`DELETE FROM ticket_limits WHERE user_id = $1 AND guild_id = $2`, [match[1], guild.id]);
                            }

                            setTimeout(async () => {
                                try { await chan.delete(); } catch (err) {}
                            }, 5000);
                        }
                    }
                } catch (err) {
                    // Ignored
                }
            });
        } catch (err) {
            // Ignored
        }
    });
}

client.login(process.env.DISCORD_TOKEN);
                                                    
