const { Client: DBClient } = require('pg');
const { Client: DiscordClient, GatewayIntentBits } = require('discord.js');

// 1. Hubinta iyo Xiriirka PostgreSQL Database (Railway)
const dbClient = new DBClient({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Wuxuu ka hortagbaa SSL error-ka Railway Cloud
  }
});

dbClient.connect()
  .then(() => console.log('✅ PostgreSQL database-ka waa lagu xirmay si guul leh!'))
  .catch(err => {
    console.error('❌ Khalad ayaa dhacay marka lala xiriirayay Postgres:', err.message);
  });

// 2. Habaynta Discord Bot
const bot = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Line-kan oo la saxay backticks-kiisa
bot.once('ready', () => {
  console.log(🤖 Bot-ku waa online! Wuxuu ku login gareeyay: ${bot.user.tag});
});

// Amarka tijaabada ah
bot.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🏓 Pong! Bot-ku waa 24/7 online saddexda platform-ba (GitHub, Kinesis, Railway).');
  }
});

// 3. Login-ka Bot-ka iyada oo la adeegsanayo Environment Variable
bot.login(process.env.DISCORD_TOKEN);
