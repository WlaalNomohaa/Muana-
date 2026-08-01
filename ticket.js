const { Client, GatewayIntentBits } = require('discord.js');

// Habaynta Discord Bot-ka
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Marka uu bot-ku online noqdo
bot.once('ready', () => {
  console.log(`✅ Bot-ku si buuxda ayuu u shaqaynayaa! Wuxuu ku login gareeyay: ${bot.user.tag}`);
});

// Amarka tijaabada ah
bot.on('messageCreate', async (message) => {
  // Ka hortag in bot-ku uu is jawaabo
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🏓 Pong! Bot-ku waa 24/7 online oo la tijaabiyay.');
  }
});

// Login-ka iyada oo la adeegsanayo Environment Variable
bot.login(process.env.DISCORD_TOKEN);
