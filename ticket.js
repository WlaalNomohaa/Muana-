const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField 
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Waxaan isticmaalaynaa process.env si aan xogta uga soo qaadano Kinesis Network
const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

client.once('ready', () => {
    console.log(`Bot-ka ${client.user.tag} wuu shaqaynayaa!`);
});

// Amarka !setup-ticket
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-ticket') {
        // Hubi in qofka qoray uu yahay Admin
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle("🎫 Taageero Farsamo (Ticket)")
            .setDescription("Guji badhanka hoose si aad u furato ticket cusub.")
            .setColor(0x0099FF);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open-ticket')
                .setLabel('Fur Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// Maamulka Button-ka
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'open-ticket') {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: ADMIN_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ],
        });

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close-ticket')
                .setLabel('Xir Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ 
            content: `Hello <@${interaction.user.id}>, maamulku wuu kula soo xiriiri doonaa.`, 
            components: [closeRow] 
        });

        await interaction.reply({ content: `Ticket-kaaga waxaa la sameeyay: ${channel}`, ephemeral: true });
    }

    if (interaction.customId === 'close-ticket') {
        // Hubi in qofka xiraya uu leeyahay Admin Role
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: "Admin kaliya ayaa xiri kara!", ephemeral: true });
        }
        await interaction.reply("Channel-ka waa la tirtirayaa...");
        setTimeout(() => interaction.channel.delete(), 3000);
    }
});

client.login(TOKEN);
