const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require('discord.js');

// 1. Habaynta Bot-ka
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Kaydinta Nidaamka Anti-link iyo Auto-role
let antiLinkStatus = {}; // { guildId: true/false }
let autoRoles = {};      // { guildId: roleId }

// 2. Abuurista Amarrada Slash Commands (/)
const commands = [
  // /help (Leh options: search & ephemeral siday sawirada ka muuqdaan)
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tusa amarrada bot-ka iyo caawinaad')
    .addStringOption(option => 
      option.setName('search')
        .setDescription('Natiijada ama qeybta aad raadinayso')
        .setRequired(false))
    .addBooleanOption(option => 
      option.setName('ephemeral')
        .setDescription('Mise fariinta adiga kaliya ayaad rabtaa inaad aragto? (True/False)')
        .setRequired(false)),

  // /add-role (Lagu siiyo User-ka Role gaar ah)
  new SlashCommandBuilder()
    .setName('add-role')
    .setDescription('Siiyo User role gaar ah')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka la siinayo role-ka').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka la siinayo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  // /remove-role (Laga qaado User-ka Role-ka)
  new SlashCommandBuilder()
    .setName('remove-role')
    .setDescription('Ka qaad User role-ka uu leeyahay')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka laga qaadayo').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka laga qaadayo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  // /move (Kalka xaaqista ama rarida User/Voice Channel)
  new SlashCommandBuilder()
    .setName('move')
    .setDescription('U rar user-ka ama channel-ka meel kale')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka aad rabto inaad rarto').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Voice Channel-ka loo rarayo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  // /antilink (On ama Off looga dhigo xakamaynta links-ka)
  new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Ka shid ama ka dami server-ka xakamaynta link-yada')
    .addStringOption(opt => 
      opt.setName('status')
        .setDescription('Dooro On ama Off')
        .setRequired(true)
        .addChoices(
          { name: 'On (Link-yada waa la diadayaa)', value: 'on' },
          { name: 'Off (Link-yada waa la ogolyahay)', value: 'off' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // /setup (Otomaatig u sameeyo qeybaha bot-ka)
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Otomaatig u samee habaynta server-ka iyo bot-ka')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // /id (Kuu sheegaya User ID ama Role ID)
  new SlashCommandBuilder()
    .setName('id')
    .setDescription('Soo saar ID-ga User-ka ama Role-ka')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka aad ID-giisa u baahan tahay').setRequired(false))
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka aad ID-giisa u baahan tahay').setRequired(false)),

  // /autorole (U door Role qof walba oo server-ka soo biira si toos ah loo siiyo)
  new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('U door role qof walba oo soo biira si toos ah loo siiyo')
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka otomaatiga ah').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// 3. Marka Bot-ku shaqo bilaabo (Register Slash Commands)
bot.once('ready', async () => {
  console.log(`✅ Bot-ku waa ready! Wuxuu ku login gareeyay: ${bot.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Waxaa socota diwaan-gelinta Slash Commands...');
    await rest.put(Routes.applicationCommands(bot.user.id), { body: commands });
    console.log('✅ Amarrada oo dhan si guul leh ayaa loo diwaan-geliyay!');
  } catch (error) {
    console.error('❌ Qalad ayaa dhacay marka amarrada la diwaan-gelinayay:', error);
  }
});

// 4. Qabashada Qaybaha Amarrada (Interaction Handling)
bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild } = interaction;

  // --- /help ---
  if (commandName === 'help') {
    const searchQuery = options.getString('search') || 'Bilaash';
    const isEphemeral = options.getBoolean('ephemeral') ?? true; // Default: True (Adiga kaliya ayaa arkayo)

    const embed = new EmbedBuilder()
      .setTitle('📚 Bot Help Center')
      .setDescription(`Natiijada raadinta: **${searchQuery}**\n\n` +
        '`/help` - Amarrada iyo caawinaada\n' +
        '`/add-role` - Siiyo user role\n' +
        '`/remove-role` - Ka qaad user role\n' +
        '`/move` - U rar user Voice channel kale\n' +
        '`/antilink` - Ka shid/dami xakamaynta links-ka\n' +
        '`/setup` - Otomaatig habaynta server-ka\n' +
        '`/id` - Soo saar User ama Role ID\n' +
        '`/autorole` - Habee auto-role-ka xubnaha cusub')
      .setColor('#5865F2');

    await interaction.reply({ embeds: [embed], ephemeral: isEphemeral });
  }

  // --- /add-role ---
  else if (commandName === 'add-role') {
    const targetUser = options.getMember('user');
    const role = options.getRole('role');

    await targetUser.roles.add(role);
    await interaction.reply({ content: `✅ Waxaa si guul leh role-ka **${role.name}** loogu daray ${targetUser.user.tag}.`, ephemeral: true });
  }

  // --- /remove-role ---
  else if (commandName === 'remove-role') {
    const targetUser = options.getMember('user');
    const role = options.getRole('role');

    await targetUser.roles.remove(role);
    await interaction.reply({ content: `🗑️ Waxaa role-ka **${role.name}** ka qaaday ${targetUser.user.tag}.`, ephemeral: true });
  }

  // --- /move ---
  else if (commandName === 'move') {
    const targetUser = options.getMember('user');
    const channel = options.getChannel('channel');

    if (!targetUser.voice.channel) {
      return interaction.reply({ content: '❌ User-ku kuma jiro Voice Channel!', ephemeral: true });
    }

    await targetUser.voice.setChannel(channel);
    await interaction.reply({ content: `🚚 ${targetUser.user.tag} waxaa loo raray channel-ka **${channel.name}**.`, ephemeral: true });
  }

  // --- /antilink ---
  else if (commandName === 'antilink') {
    const status = options.getString('status');
    antiLinkStatus[guild.id] = (status === 'on');

    await interaction.reply({ 
      content: `🔒 Anti-link waxaa looga dhigay: **${status.toUpperCase()}**`, 
      ephemeral: true 
    });
  }

  // --- /setup ---
  else if (commandName === 'setup') {
    await interaction.reply({ content: '⚙️ Habaynta otomaatiga ah ee bot-ka waa lagu guuleystay!', ephemeral: true });
  }

  // --- /id ---
  else if (commandName === 'id') {
    const targetUser = options.getUser('user');
    const targetRole = options.getRole('role');

    if (targetUser) {
      await interaction.reply({ content: `🆔 ID-ga User-ka **${targetUser.tag}** waa: \`${targetUser.id}\``, ephemeral: true });
    } else if (targetRole) {
      await interaction.reply({ content: `🆔 ID-ga Role-ka **${targetRole.name}** waa: \`${targetRole.id}\``, ephemeral: true });
    } else {
      await interaction.reply({ content: `🆔 ID-gaaga: \`${interaction.user.id}\` | Server ID: \`${guild.id}\``, ephemeral: true });
    }
  }

  // --- /autorole ---
  else if (commandName === 'autorole') {
    const role = options.getRole('role');
    autoRoles[guild.id] = role.id;

    await interaction.reply({ content: `🤖 Wixii hadda ka dambeeya qof walba oo soo biira wuxuu si otomaatig ah u heli doonaa role-ka **${role.name}**.`, ephemeral: true });
  }
});

// 5. Anti-link System Event (Qabashada fariimaha qoraalka ah)
bot.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const isAntiLinkOn = antiLinkStatus[message.guild.id];
  if (isAntiLinkOn) {
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(message.content)) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.delete();
        message.channel.send(`⚠️ ${message.author}, Server-kan laguma soo diri karo wax Link ah!`).then(msg => {
          setTimeout(() => msg.delete(), 5000);
        });
      }
    }
  }
});

// 6. Auto-Role Event (Xubnaha cusub ee soo biiraya)
bot.on('guildMemberAdd', async (member) => {
  const autoRoleId = autoRoles[member.guild.id];
  if (autoRoleId) {
    try {
      await member.roles.add(autoRoleId);
      console.log(`Auto-role waxaa la siiyay: ${member.user.tag}`);
    } catch (err) {
      console.error('Qalad ka dhacay siinta auto-role-ka:', err);
    }
  }
});

// Login-ka Bot-ka
bot.login(process.env.DISCORD_TOKEN);
