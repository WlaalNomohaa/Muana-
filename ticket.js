const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
  ChannelType
} = require('discord.js');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let antiLinkStatus = {}; 
let autoRoles = {};      
let linkWarnings = {};   

const helpOptions = [
  'How to Setup Bot',
  'How This Work Bot?',
  'How to add Bot Server',
  'All Commands',
  'Warning',
  'Another Problem'
];

const commands = [
  // 1. HELP COMMAND
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tusa amarrada bot-ka iyo caawinaad')
    .addStringOption(option => 
      option.setName('search')
        .setDescription('Dooro ama raadi qeybta aad u baahan tahay')
        .setRequired(false)
        .setAutocomplete(true))
    .addBooleanOption(option => 
      option.setName('ephemeral')
        .setDescription('Adiga kaliya mise server-ka oo dhan?')
        .setRequired(false)),

  // 2. MOVE USER COMMAND
  new SlashCommandBuilder()
    .setName('move')
    .setDescription('U rar user channel/chat kasta oo aad rabto')
    .addChannelOption(opt => 
      opt.setName('channel')
        .setDescription('Dooro Channel-ka ama Chat-ka loo rarayo user-ka')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice, ChannelType.GuildText)
        .setRequired(true))
    .addUserOption(opt => 
      opt.setName('user')
        .setDescription('User-ka aad rabto inaad rarto')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  // 3. MOVE CHANNEL COMMAND
  new SlashCommandBuilder()
    .setName('move-channel')
    .setDescription('U rar channel (Text ama Voice) category kale')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel-ka aad rabto inaad rarto').setRequired(true))
    .addChannelOption(opt => opt.setName('category').setDescription('Category-ga loo rarayo').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // 4. CLEAR MESSAGES COMMAND
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Tirtir fariimaha chat-ka ku jira')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Tirada fariimaha (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // 5. SERVER INFO COMMAND (QURXISON)
  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Soo saar xogta server-ka ee leh sawir, ID, xiliga la sameeyay & owner-ka'),

  // 6. USER INFO COMMAND (QURXISON)
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Soo saar xogta user-ka (Sawirkiisa, xiliga uu discord & server-ka soo galay)')
    .addUserOption(opt => opt.setName('user').setDescription('Dooro User-ka aad xogtiisa u baahan tahay').setRequired(false)),

  // 7. POLL COMMAND (QURXISON)
  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Abuur codeyn qurxon oo xubnuhu ka qeyb qaadan karaan')
    .addStringOption(opt => opt.setName('question').setDescription('Mawduuca ama su\'aasha codeynta').setRequired(true)),

  // 8. WRITE MESSAGE COMMAND
  new SlashCommandBuilder()
    .setName('writemsg')
    .setDescription('Ku amr bot-ka inuu diro fariin aad qortay')
    .addStringOption(opt => opt.setName('message').setDescription('Fariinta aad rabto in bot-ku diro').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel-ka fariinta loo dirayo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // 9. FEEDBACK COMMAND
  new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Dhiibo fikradaada iyo qiimayn xiddigo ah (1-10)')
    .addStringOption(opt => opt.setName('message').setDescription('Fariintaada').setRequired(true))
    .addIntegerOption(opt => opt.setName('rating').setDescription('Qiimee (1-10)').setRequired(true).setMinValue(1).setMaxValue(10)),

  // 10. OTHER ADMIN COMMANDS
  new SlashCommandBuilder().setName('add-role').setDescription('Siiyo User role').addUserOption(opt => opt.setName('user').setRequired(true)).addRoleOption(opt => opt.setName('role').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder().setName('remove-role').setDescription('Ka qaad User role').addUserOption(opt => opt.setName('user').setRequired(true)).addRoleOption(opt => opt.setName('role').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder().setName('antilink').setDescription('Ka shid/dami anti-link').addStringOption(opt => opt.setName('status').setRequired(true).addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' })).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('setup').setDescription('Habaynta otomaatiga ah').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('id').setDescription('Soo saar ID-ga User/Role').addUserOption(opt => opt.setName('user')).addRoleOption(opt => opt.setName('role')),
  new SlashCommandBuilder().setName('autorole').setDescription('Habee auto-role').addRoleOption(opt => opt.setName('role').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

bot.once('ready', async () => {
  console.log('✅ Bot-ku waa ready! Tag: ' + bot.user.tag);
  bot.user.setActivity('💃', { type: ActivityType.Watching });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(bot.user.id), { body: commands });
    console.log('✅ Amarrada oo dhan waa la diwaan-geliyay!');
  } catch (error) {
    console.error('❌ Qalad:', error);
  }
});

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel } = interaction;
  const isEphemeral = options.getBoolean('ephemeral') ?? false;

  try {
    await interaction.deferReply({ ephemeral: isEphemeral });

    // ---------------- /serverinfo ----------------
    if (commandName === 'serverinfo') {
      const serverIcon = guild.iconURL({ dynamic: true, size: 1024 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
      
      const embed = new EmbedBuilder()
        .setTitle(`🏰 XOGTA BUUXTA EE SERVER-KA: ${guild.name.toUpperCase()}`)
        .setDescription(`📌 *Kani waa macluumaadka guud ee Server-ka illaa xilligan.*`)
        .setThumbnail(serverIcon)
        .addFields(
          { name: '👑 Aasaasaha (Owner)', value: `<@${guild.ownerId}>`, inline: true },
          { name: '🆔 ID-ga Server-ka', value: `\`${guild.id}\``, inline: true },
          { name: '📅 Xilliga la Sameeyay', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false }
        )
        .setColor('#2F3136')
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // ---------------- /userinfo ----------------
    else if (commandName === 'userinfo') {
      const targetUser = options.getMember('user') || interaction.member;
      const userAvatar = targetUser.user.displayAvatarURL({ dynamic: true, size: 1024 });

      const embed = new EmbedBuilder()
        .setTitle(`👤 PROFIL-KA & XOGTA: ${targetUser.user.username.toUpperCase()}`)
        .setDescription(`✨ *Macluumaadka xubinta la doortay ee Discord-ka iyo Server-ka.*`)
        .setThumbnail(userAvatar)
        .addFields(
          { name: '🌐 Discord Ku Soo Biiray', value: `<t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:R>)`, inline: false },
          { name: '📥 Server-ka Soo Galay', value: `<t:${Math.floor(targetUser.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(targetUser.joinedTimestamp / 1000)}:R>)`, inline: false }
        )
        .setColor('#5865F2')
        .setFooter({ text: `ID: ${targetUser.id}`, iconURL: userAvatar })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // ---------------- /poll ----------------
    else if (commandName === 'poll') {
      const question = options.getString('question');

      const embed = new EmbedBuilder()
        .setTitle('📊 CODEYN CUSUB / POLL')
        .setDescription(`\n**${question}**\n\n━━━━━━━━━━━━━━━━━━━━━━\n👍 = **Raiiga Wanaagsan / Haa**\n👎 = **Raiiga Diidmada / Maya**`)
        .setColor('#FEE75C')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: 'Dhiibo aragtidaada adiga oo gujinaya emoji-yada hoose!' })
        .setTimestamp();

      const reply = await interaction.editReply({ embeds: [embed] });
      
      // React to the poll message
      const msg = await interaction.channel.messages.fetch(reply.id);
      await msg.react('👍');
      await msg.react('👎');
    }

    // ---------------- /clear ----------------
    else if (commandName === 'clear') {
      const amount = options.getInteger('amount');
      await channel.bulkDelete(amount, true);
      await interaction.editReply({ content: `🗑️ Waxaa si guul leh loo tirtiray **${amount}** fariimood!` });
    }

    // ---------------- /move ----------------
    else if (commandName === 'move') {
      const targetChannel = options.getChannel('channel');
      const targetUser = options.getMember('user');

      if (!targetUser) return await interaction.editReply({ content: '❌ User-ka laguma helin!' });

      if (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice) {
        if (!targetUser.voice || !targetUser.voice.channel) {
          return await interaction.editReply({ content: `⚠️ **${targetUser.user.tag}** kuma jiro Voice!` });
        }
        if (targetUser.voice.channel.id === targetChannel.id) {
          return await interaction.editReply({ content: `ℹ️ **${targetUser.user.tag}** wuxuu horey uga dhex jiraa **${targetChannel.name}**!` });
        }
        await targetUser.voice.setChannel(targetChannel);
        return await interaction.editReply({ content: `🚚 **${targetUser.user.tag}** waxaa loo raray **${targetChannel.name}**!` });
      } else {
        return await interaction.editReply({ content: `💬 Chat-ka **${targetChannel.name}** waxaa loo xiriiriyay **${targetUser.user.tag}**!` });
      }
    }

  } catch (err) {
    console.error(`❌ Khalad:`, err.message);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ Khalad ayaa dhacay: \`${err.message}\`` });
    }
  }
});

bot.login(process.env.DISCORD_TOKEN);
