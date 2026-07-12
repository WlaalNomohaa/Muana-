const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder().setName('setup-ticket').setDescription('Setup Tickets')
        .addChannelOption(o => o.setName('channel').setDescription('Dooro channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('title').setDescription('Cinwaanka').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Sharaxaadda').setRequired(true)),
    new SlashCommandBuilder().setName('setup-verify').setDescription('Setup Verify')
        .addChannelOption(o => o.setName('channel').setDescription('Dooro channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('description').setDescription('Sharaxaadda').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`Bot is active: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply({ ephemeral: true });

    const { options, guild } = interaction;

    if (interaction.commandName === 'setup-ticket') {
        const channel = options.getChannel('channel');
        const embed = new EmbedBuilder().setTitle(options.getString('title')).setDescription(options.getString('description')).setColor('Blue');
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_select_menu').setPlaceholder('Dooro nooca ticket-ka')
                .addOptions([{ label: 'General Support', value: 'general' }, { label: 'Report', value: 'report' }])
        );
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply({ content: `✅ Ticket-ka waa la diyaariyay!` });
    }

    if (interaction.commandName === 'setup-verify') {
        const channel = options.getChannel('channel');
        const embed = new EmbedBuilder().setTitle('Verification').setDescription(options.getString('description')).setColor('Green');
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('verify_menu').setPlaceholder('Guji si aad u verify-garayso')
                .addOptions([{ label: 'Verify', value: 'verify_user' }])
        );
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply({ content: `✅ Nidaamka Verify-ga waa la diyaariyay!` });
    }
});

client.login(process.env.DISCORD_TOKEN);
