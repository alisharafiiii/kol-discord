console.log('🧪 starting bot.js...');


const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.on('ready', () => {
  console.log(`🤖 logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.reply('pong!');
  }
});

client.login('MTM4MTg2Nzc0Mjk1MjU1NDYxNg.G03q5T.P3PEmlg_rfm8G-cqUibwR8KknYofULEYFX0c60');
