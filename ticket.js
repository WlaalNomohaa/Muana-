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
  ChannelType
} = require('discord.js');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

let antiLinkStatus = {}; 
let autoRoles = {};      

// Liiska Search-ka ee /help
const helpOptions = [
  'How to Setup Bot',
  'How This Work Bot?',
  'How to add Bot Server',
  'All Commands',
  'Warning'
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

  // 2. MOVE COMMAND (User ama Channel)
  new SlashCommandBuilder()
    .setName('move')
    .setDescription('U rar user ama channel meel kale')
    .addSubcommand(sub => 
      sub.setName('user')
        .setDescription('U rar user Voice Channel kale')
        .addUserOption(opt => opt.setName('user').setDescription('User-ka la rarayo').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Voice Channel-ka loo rarayo').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('channel')
        .setDescription('U rar channel Category kale')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel-ka la rarayo').setRequired(true))
        .addChannelOption(opt => opt.setName('category').setDescription('Category-ga cusub ee loo rarayo').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // 3. OTHER COMMANDS
  new SlashCommandBuilder()
    .setName('add-role')
    .setDescription('Siiyo User role gaar ah')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka la siinayo role-ka').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka la siinayo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('remove-role')
    .setDescription('Ka qaad User role-ka uu leeyahay')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka laga qaadayo').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka laga qaadayo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

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

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Otomaatig u samee habaynta server-ka iyo bot-ka')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('id')
    .setDescription('Soo saar ID-ga User-ka ama Role-ka')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka aad ID-giisa u baahan tahay').setRequired(false))
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka aad ID-giisa u baahan tahay').setRequired(false)),

  new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('U door role qof walba oo soo biira si toos ah loo siiyo')
    .addRoleOption(opt => opt.setName('role').setDescription('Role-ka otomaatiga ah').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

bot.once('ready', async () => {
  console.log('✅ Bot-ku waa ready! Wuxuu ku login gareeyay: ' + bot.user.tag);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Waxaa socota diwaan-gelinta Slash Commands...');
    await rest.put(Routes.applicationCommands(bot.user.id), { body: commands });
    console.log('✅ Amarrada oo dhan si guul leh ayaa loo diwaan-geliyay!');
  } catch (error) {
    console.error('❌ Qalad ayaa dhacay marka amarrada la diwaan-gelinayay:', error);
  }
});

bot.on('interactionCreate', async (interaction) => {
  // Autocomplete Request
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'help') {
      const focusedValue = interaction.options.getFocused();
      const filtered = helpOptions.filter(choice => 
        choice.toLowerCase().includes(focusedValue.toLowerCase())
      );
      await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice }))
      );
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild } = interaction;
  const isEphemeral = options.getBoolean('ephemeral') ?? true;

  try {
    await interaction.deferReply({ ephemeral: isEphemeral });

    // ---------------- /help Command ----------------
    if (commandName === 'help') {
      const searchQuery = options.getString('search') || 'All Commands';

      let descriptionText = '';
      let components = [];

      if (searchQuery === 'How to Setup Bot') {
        descriptionText = '🛠️ **How to Setup Bot:**\n\n1. Sii Bot-ka **Administrator** Permission.\n2. Ka dhig Role-ka bot-ka midka ugu sareeya xagga Server Roles-ka.\n3. U adeegso amarka `/setup` si aad u abuurto otomaatig habaynta server-ka.';
      } 
      else if (searchQuery === 'How This Work Bot?') {
        descriptionText = '🤖 **How This Bot Works:**\n\nBot-kan wuxuu maareeyaa maamulka server-ka (Moderation), Auto-Roles, Anti-link Security, iyo rarista isticmaalayaasha/channels-ka reebidda amarrada `/move`.';
      } 
      else if (searchQuery === 'How to add Bot Server') {
        descriptionText = '🔗 **How to Add Bot to Your Server:**\n\nRiix batoonka hoose si aad bot-ka ugu soo dartid Server kale oo aad admin ka tahay.';

        const inviteLink = 'https://discord.com/oauth2/authorize?client_id=1525781462543237231&permissions=8&integration_type=0&scope=bot';
        const button = new ButtonBuilder()
          .setLabel('Add Bot To Server')
          .setStyle(ButtonStyle.Link)
          .setURL(inviteLink);

        const row = new ActionRowBuilder().addComponents(button);
        components = [row];
      } 
      else if (searchQuery === 'Warning') {
        descriptionText = '⚠️ **Bot Warnings & Limits:**\n\n- Bot-ku ma siin karo ama ma ka qaadi karo role ka sareeya Role-kiisa.\n- Bot-ku wuxuu u baahan yahay **Administrator Permission** si uu amarrada oo dhan u fuliyo.\n- Iska jir in aad bot-ka ka qaaddo permissions-ka habaysan xagga Server Settings-ka.';
      } 
      else { // All Commands
        descriptionText = '📜 **All Available Commands:**\n\n' +
          '`/help` - Tusa caawinaada iyo amarrada\n' +
          '`/move user` - U rar user Voice Channel kale\n' +
          '`/move channel` - U rar channel Category kale\n' +
          '`/add-role` - Siiyo user role gaar ah\n' +
          '`/remove-role` - Ka qaad user role\n' +
          '`/antilink` - Ka shid/dami xakamaynta links-ka\n' +
          '`/setup` - Otomaatig habaynta server-ka\n' +
          '`/autorole` - Habee auto-role-ka xubnaha cusub\n' +
          '`/id` - Soo saar ID-ga User ama Role';
      }

      const embed = new EmbedBuilder()
        .setTitle('📚 Help Center - ' + searchQuery)
        .setDescription(descriptionText)
        .setColor('#5865F2');

      await interaction.editReply({ embeds: [embed], components: components });
    }

    // ---------------- /move Command ----------------
    else if (commandName === 'move') {
      const subcommand = options.getSubcommand();

      if (subcommand === 'user') {
        const targetUser = options.getMember('user');
        const voiceChannel = options.getChannel('channel');

        if (!targetUser.voice.channel) {
          return interaction.editReply({ content: '❌ User-ku kuma jiro wax Voice Channel ah xiligan!' });
        }

        await targetUser.voice.setChannel(voiceChannel);
        await interaction.editReply({ content: `🚚 Waxaa si guul leh **${targetUser.user.tag}** loogu raray Voice Channel-ka **${voiceChannel.name}**.` });
      } 
      else if (subcommand === 'channel') {
        const targetChannel = options.getChannel('channel');
        const category = options.getChannel('category');

        await targetChannel.setParent(category.id);
        await interaction.editReply({ content: `📁 Waxaa si guul leh channel-ka **${targetChannel.name}** loogu raray Category-ga **${category.name}**.` });
      }
    }

    // ---------------- /add-role Command ----------------
    else if (commandName === 'add-role') {
      const targetUser = options.getMember('user');
      const role = options.getRole('role');

      await targetUser.roles.add(role);
      await interaction.editReply({ content: `✅ Waxaa si guul leh role-ka **${role.name}** loogu daray ${targetUser.user.tag}.` });
    }

    // ---------------- /remove-role Command ----------------
    else if (commandName === 'remove-role') {
      const targetUser = options.getMember('user');
      const role = options.getRole('role');

      await targetUser.roles.remove(role);
      await interaction.editReply({ content: `🗑️ Waxaa role-ka **${role.name}** ka qaaday ${targetUser.user.tag}.` });
    }

    // ---------------- /antilink Command ----------------
    else if (commandName === 'antilink') {
      const status = options.getString('status');
      antiLinkStatus[guild.id] = (status === 'on');

      await interaction.editReply({ content: `🔒 Anti-link waxaa looga dhigay: **${status.toUpperCase()}**` });
    }

    // ---------------- /setup Command ----------------
    else if (commandName === 'setup') {
      await interaction.editReply({ content: '⚙️ Habaynta otomaatiga ah ee bot-ka waa lagu guuleystay!' });
    }

    // ---------------- /id Command ----------------
    else if (commandName === 'id') {
      const targetUser = options.getUser('user');
      const targetRole = options.getRole('role');

      if (targetUser) {
        await interaction.editReply({ content: `🆔 ID-ga User-ka **${targetUser.tag}** waa: \`${targetUser.id}\`` });
      } else if (targetRole) {
        await interaction.editReply({ content: `🆔 ID-ga Role-ka **${targetRole.name}** waa: \`${targetRole.id}\`` });
      } else {
        await interaction.editReply({ content: `🆔 ID-gaaga: \`${interaction.user.id}\` | Server ID: \`${guild.id}\`` });
      }
    }

    // ---------------- /autorole Command ----------------
    else if (commandName === 'autorole') {
      const role = options.getRole('role');
      autoRoles[guild.id] = role.id;

      await interaction.editReply({ content: `🤖 Wixii hadda ka dambeeya qof walba oo soo biira wuxuu si otomaatig ah u heli doonaa role-ka **${role.name}**.` });
    }

  } catch (err) {
    console.error(`❌ Khalad ayaa ka dhacay amarka /${commandName}:`, err.message);
    const errorMsg = '❌ Khalad ayaa dhacay! Hubi in Bot-ku leeyahay Permission-ka ku filan ama Role-ka uu ka sareeyo bot-ka.';
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
});

// Message Event (Anti-link)
bot.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
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
  } catch (err) {
    console.error('Qalad ka dhacay Anti-link:', err.message);
  }
});

// Auto Role marka qof cusub soo biiro
bot.on('guildMemberAdd', async (member) => {
  const autoRoleId = autoRoles[member.guild.id];
  if (autoRoleId) {
    try {
      await member.roles.add(autoRoleId);
      console.log(`Auto-role waxaa la siiyay: ${member.user.tag}`);
    } catch (err) {
      console.error('Qalad ka dhacay siinta auto-role-ka:', err.message);
    }
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

bot.login(process.env.DISCORD_TOKEN);
