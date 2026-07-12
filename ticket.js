const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// 2. Diyaarinta amarrada (/setup-ticket iyo amarka cusub /tick)
const commands = [
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Ku dhex sameey nidaamka Ticket-ka channel gaar ah (Admins Only).')
        .addChannelOption(option => option.setName('channel').setDescription('Channel-ka la dhigayo badanka Ticket-ka').setRequired(true).addChannelTypes(ChannelType.GuildText))
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

    // Hubi oggolaanshaha Admin-ka ee labada amarba
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

            const ticketRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket_btn')
                    .setLabel('Create Ticket 📩')
                    .setStyle(ButtonStyle.Primary)
            );

            await ticketChannel.send({
                content: `📩 **Support & Help System** 📩\n\nHaddii aad qabto cabasho, su'aal, ama aad u baahan tahay taageerada maamulka, fadlan guji badanka hoose si uu kuugu furmo channel adiga kuu gaar ah.`,
                components: [ticketRow]
            });

            await interaction.reply({ content: `✅ Nidaamka Ticket-ka si guul leh ayaa loogu habeeyey channel-ka ${ticketChannel}!`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '❌ Khalad ayaa dhacay marka la habaynayay Ticket-ka.', ephemeral: true });
        }
    }

    // --- /tick (AMARKA CUSUB EE GACANTA LOOGU FURAYO QOFKA TICKET) ---
    if (commandName === 'tick') {
        await interaction.deferReply({ ephemeral: true });
        const targetUser = interaction.options.getUser('user');

        try {
            // Kasoo aqri category id-ga database-ka
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            if (res.rows.length === 0) {
                return interaction.editReply({ content: '❌ Nidaamka Ticket-ka ee server-kan wali lama qaabayn. Fadlan marka hore sameey `/setup-ticket`.' });
            }

            const categoryId = res.rows[0].category_id;
            const channelName = `ticket-${targetUser.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            // Hubi in qofkaas uu horey u lahaa ticket furan
            const existingChannel = guild.channels.cache.find(c => c.name === channelName && c.parentId === categoryId);
            if (existingChannel) {
                return interaction.editReply({ content: `ℹ️ Xubintan horey waxay u leedahay Ticket furan: ${existingChannel}` });
            }

            // Abuur channel-ka qarsoooon ee qofkaas u gaarka ah
            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: targetUser.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket_btn')
                    .setLabel('Close Ticket 🔒')
                    .setStyle(ButtonStyle.Danger)
            );

            await privateChannel.send({
                content: `👋 Ku soo dhawaada qaybta Taageerada, ${targetUser}!\n\nMaamulaha ${interaction.user} ayaa si toos ah kuugu furay Ticket-kan si laguu caawiyo.\n\n*Maamulayaasha kaliya ayaa xiri karo channel-kan adoo gujinaya badanka hoose.*`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Si guul leh ayaa Ticket loogu furay qofka **${targetUser.tag}**: ${privateChannel}` });

        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad marka la furayay Ticket-ka.' });
        }
    }
});

// 5. QABASHADA BADAMADA TICKET-KA (BUTTONS)
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const { customId, guild, user, channel } = interaction;

    // A. GUJINTA BADANKA "CREATE TICKET"
    if (customId === 'create_ticket_btn') {
        await interaction.deferReply({ ephemeral: true });

        try {
            const res = await pgClient.query('SELECT category_id FROM tickets WHERE guild_id = $1', [guild.id]);
            if (res.rows.length === 0) {
                return interaction.editReply({ content: '❌ Nidaamka Ticket-ka ee server-kan wali lama qaabayn.' });
            }

            const categoryId = res.rows[0].category_id;
            const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            const existingChannel = guild.channels.cache.find(c => c.name === channelName && c.parentId === categoryId);
            if (existingChannel) {
                return interaction.editReply({ content: `ℹ️ Horey waxaad u leedahay Ticket furan: ${existingChannel}` });
            }

            const privateChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket_btn')
                    .setLabel('Close Ticket 🔒')
                    .setStyle(ButtonStyle.Danger)
            );

            await privateChannel.send({
                content: `👋 Ku soo dhawaada qaybta Taageerada, ${user}!\n\nMaamulka ayaa dhowaan kuu jawaabi doona. Fadlan halkan ku qor faahfaahinta cabashadaada.\n\n*Maamulayaasha kaliya ayaa xiri karo channel-kan adoo gujinaya badanka hoose.*`,
                components: [closeRow]
            });

            await interaction.editReply({ content: `✅ Ticket-kaagii si guul leh ayaa loo abuuray: ${privateChannel}` });

        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Waxaa dhacay khalad marka la furayay Ticket-ka.' });
        }
    }

    // B. GUJINTA BADANKA "CLOSE TICKET"
    if (customId === 'close_ticket_btn') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Kaliya Maamulayaasha (Admins) ayaa xiri kara ticket-ka!', ephemeral: true });
        }

        await interaction.reply({ content: '🔒 Ticket-kan waa la xirayaa 5 ilbiriqsi gudahood...' });

        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (err) {
                console.error('Ma tirtiri karo channel-ka:', err);
            }
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
                
