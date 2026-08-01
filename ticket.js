const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder 
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

const commands = [
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
    .setName('move')
    .setDescription('U rar user-ka ama channel-ka meel kale')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka aad rabto inaad rarto').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Voice Channel-ka loo rarayo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

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

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild } = interaction;

  // Si looga hortago "The application did not respond", halkan ayaan kaga dhigaynaa deferReply
  const isEphemeral = options.getBoolean('ephemeral') ?? true;

  try {
    // Si toos ah Discord u ogeysii in bot-ku uu ku guda jiro diyaarinta jawaabta
    await interaction.deferReply({ ephemeral: isEphemeral });

    if (commandName === 'help') {
      const searchQuery = options.getString('search') || 'Bilaash';

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

      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'add-role') {
      const targetUser = options.getMember('user');
      const role = options.getRole('role');

      await targetUser.roles.add(role);
      await interaction.editReply({ content: `✅ Waxaa si guul leh role-ka **${role.name}** loogu daray ${targetUser.user.tag}.` });
    }

    else if (commandName === 'remove-role') {
      const targetUser = options.getMember('user');
      const role = options.getRole('role');

      await targetUser.roles.remove(role);
      await interaction.editReply({ content: `🗑️ Waxaa role-ka **${role.name}** ka qaaday ${targetUser.user.tag}.` });
    }

    else if (commandName === 'move') {
      const targetUser = options.getMember('user');
      const channel = options.getChannel('channel');

      if (!targetUser.voice.channel) {
        return interaction.editReply({ content: '❌ User-ku kuma jiro Voice Channel!' });
      }

      await targetUser.voice.setChannel(channel);
      await interaction.editReply({ content: `🚚 ${targetUser.user.tag} waxaa loo raray channel-ka **${channel.name}**.` });
    }

    else if (commandName === 'antilink') {
      const status = options.getString('status');
      antiLinkStatus[guild.id] = (status === 'on');

      await interaction.editReply({ content: `🔒 Anti-link waxaa looga dhigay: **${status.toUpperCase()}**` });
    }

    else if (commandName === 'setup') {
      await interaction.editReply({ content: '⚙️ Habaynta otomaatiga ah ee bot-ka waa lagu guuleystay!' });
    }

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

    else if (commandName === 'autorole') {
      const role = options.getRole('role');
      autoRoles[guild.id] = role.id;

      await interaction.editReply({ content: `🤖 Wixii hadda ka dambeeya qof walba oo soo biira wuxuu si otomaatig ah u heli doonaa role-ka **${role.name}**.` });
    }
  } catch (err) {
    console.error(`❌ Khalad ayaa ka dhacay amarka /${commandName}:`, err.message);
    const errorMsg = '❌ Bot-ku ma laha Permission-ka uu amarkan ku fuliyo (sida Role-ka oo ka sareeya ama Permission vambaysan)!';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
});

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

