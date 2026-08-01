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
    GatewayIntentBits.GuildMembers
  ]
});

let antiLinkStatus = {}; 
let autoRoles = {};      
let linkWarnings = {};   // Key: `${guildId}-${userId}`, Value: Count

// Liiska Search-ka ee /help
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

  // 2. MOVE COMMAND
  new SlashCommandBuilder()
    .setName('move')
    .setDescription('U rar user channel kasta oo aad rabto')
    .addUserOption(opt => opt.setName('user').setDescription('User-ka la rarayo').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel-ka loo rarayo (Voice ama Text)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  // 3. WRITE MESSAGE COMMAND
  new SlashCommandBuilder()
    .setName('writemsg')
    .setDescription('Ku amr bot-ka inuu diro fariin aad qortay')
    .addStringOption(opt => opt.setName('message').setDescription('Fariinta aad rabto in bot-ku diro').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel-ka fariinta loo dirayo (Optional)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // 4. FEEDBACK COMMAND
  new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Dhiibo fikradaada iyo qiimayn xiddigo ah (1-10)')
    .addStringOption(opt => opt.setName('message').setDescription('Fariintaada ama fikradaada').setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('rating')
        .setDescription('Qiimee inta u dhaxaysa 1 ilaa 10')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)),

  // 5. OTHER COMMANDS
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
  bot.user.setActivity('Maamulka Server-ka', { type: ActivityType.Watching });

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

  // Handle Button Clicks (Admin Only)
  if (interaction.isButton()) {
    if (interaction.customId === 'admin_fix_issue') {
      // Check if user is Admin or the specified Admin ID
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== '1483111151469465722') {
        return interaction.reply({ content: '❌ Batoonkani waxaa isticmaali kara oo keliya **Admin-ka**!', ephemeral: true });
      }

      await interaction.update({ content: '✅ Xaaladdan waxaa xaliyay/furey Admin-ka. Mahadsanid!', components: [] });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel } = interaction;
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
        descriptionText = '🤖 **How This Bot Works:**\n\nBot-kan wuxuu maareeyaa maamulka server-ka (Moderation), Auto-Roles, Anti-link Security, fariimaha dirista, iyo rarista isticmaalayaasha.';
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
        descriptionText = '⚠️ **Bot Warnings & Limits:**\n\n- Bot-ku ma siin karo ama ma ka qaadi karo role ka sareeya Role-kiisa.\n- Bot-ku wuxuu u baahanahay **Administrator Permission** si uu amarrada oo dhan u fuliyo.';
      }
      else if (searchQuery === 'Another Problem') {
        descriptionText = '❓ **Another Problem / Caawinaad Dheeraad ah:**\n\nHaddii aad u baahan tahay caawinaad kale ama waxyaalo kale oo ku saabsan shaqaynta bot-ka, fadlan la xiriir milkiilaha/admin-ka bot-ka adiga oo riixaya batoonka hoose. \n\nAdmin ID: `1483111151469465722`\nMahadsanid!';

        // Button oo u tagaya Profile-kaaga ama Server-ka Support-ka
        const profileButton = new ButtonBuilder()
          .setLabel('La Xiriir Admin-ka')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.com/users/1483111151469465722');

        const row = new ActionRowBuilder().addComponents(profileButton);
        components = [row];
      }
      else { 
        descriptionText = '📜 **All Available Commands:**\n\n' +
          '`/help` - Tusa caawinaada iyo amarrada\n' +
          '`/move` - U rar user channel kasta\n' +
          '`/writemsg` - Ka codso bot-ka inuu fariin diro\n' +
          '`/feedback` - Dhiibo fikrad iyo xiddigo (1-10)\n' +
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
      const targetUser = options.getMember('user');
      const targetChannel = options.getChannel('channel');

      if (targetUser.voice && targetChannel.type === ChannelType.GuildVoice) { 
        await targetUser.voice.setChannel(targetChannel);
        await interaction.editReply({ content: `🚚 Waxaa si guul leh **${targetUser.user.tag}** loogu raray Voice Channel-ka **${targetChannel.name}**.` });
      } else {
        await interaction.editReply({ content: `✅ Amarka move waxaa loo diray ${targetUser} in la xiriiriyo channel-ka **${targetChannel.name}**.` });
      }
    }

    // ---------------- /writemsg Command ----------------
    else if (commandName === 'writemsg') {
      const msgText = options.getString('message');
      const targetChannel = options.getChannel('channel') || channel;

      await targetChannel.send(msgText);
      await interaction.editReply({ content: `✅ Fariintaada si guul leh ayaa loogu diray channel-ka ${targetChannel}!` });
    }

    // ---------------- /feedback Command ----------------
    else if (commandName === 'feedback') {
      const fbMessage = options.getString('message');
      const rating = options.getInteger('rating');

      const stars = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);

      const embed = new EmbedBuilder()
        .setTitle('📝 New Feedback Received')
        .addFields(
          { name: '👤 From:', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '📊 Rating:', value: `${rating}/10\n${stars}`, inline: true },
          { name: '💬 Message:', value: fbMessage, inline: false }
        )
        .setColor('#FFD700')
        .setTimestamp();

      await interaction.editReply({ content: '🎉 Mahadsanid! Fariintaada iyo qiimayntaada waxaa loo diray maamulka si guul leh.', embeds: [embed] });
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
    const errorMsg = `❌ Khalad ayaa dhacay: \`${err.message}\`. Hubi in bot-ku leeyahay Permission ku filan!`;
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
});

// Message Event (Advanced Anti-link System)
bot.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const isAntiLinkOn = antiLinkStatus[message.guild.id];
    if (isAntiLinkOn) {
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      if (linkRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          const key = `${message.guild.id}-${message.author.id}`;
          linkWarnings[key] = (linkWarnings[key] || 0) + 1;
          const count = linkWarnings[key];

          // Tirtir fariinta
          await message.delete().catch(() => {});

          if (count === 1 || count === 2) {
            // Digtooni kaliya (Warning)
            message.channel.send(`⚠️ ${message.author}, Digtooni (${count}/3): Server-kan laguma soo diri karo link-yo!`).then(msg => {
              setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
          } 
          else if (count === 3) {
            // Marka 3-aad: 30 Seconds Timeout
            try {
              await message.member.timeout(30 * 1000, 'Anti-link: 3 jeer ayuu link soo diray');
              message.channel.send(`⏳ ${message.author}, Waxaa lagu siiyay **30 seconds timeout** ah sababtoo ah waxaad soo dirtay link-yo digniin ka dib.`).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 6000);
              });
            } catch (e) {
              console.error('Timeout error:', e);
            }
          } 
          else {
            // In ka badan 3 jeer: Toos fariimaha looga xiro (Communication Disabled / Mute)
            try {
              // Timeout dheeraad ah ama ka joojin fariimaha (tusaale 1 Saacadood timeout ah si uusan u hadlin)
              await message.member.timeout(60 * 60 * 1000, 'Anti-link: Si Joogto ah ayuu u jabiyay xeerka link-yada');
              
              const adminButton = new ButtonBuilder()
                .setCustomId('admin_fix_issue')
                .setLabel('Furo / Xalli (Admin Only)')
                .setStyle(ButtonStyle.Danger);

              const row = new ActionRowBuilder().addComponents(adminButton);

              message.channel.send({
                content: `🚨 ${message.author}, Fariimahaaga waa la xiray sababtoo ah waad ku celcelisay dirista link-yada! Fadlan sug ilaa **Admin** uu ka xalliyo arrintan.`,
                components: [row]
              });
            } catch (e) {
              console.error('Mute/Timeout error:', e);
            }
          }
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
