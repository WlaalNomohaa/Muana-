const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    SlashCommandBuilder,
    PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// =====================
// Client Setup
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ],
    partials: [
        Partials.Channel
    ]
});

// =====================
// Database
// =====================
const DB = "./ticket.json";

if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify({}, null, 2));
}

let ticketConfig = JSON.parse(
    fs.readFileSync(DB, "utf8")
);

function saveDB() {
    fs.writeFileSync(
        DB,
        JSON.stringify(ticketConfig, null, 2)
    );
}


// =====================
// Slash Command Register
// =====================
client.once(Events.ClientReady, async () => {

    console.log(`${client.user.tag} Online`);

    const commands = [

        new SlashCommandBuilder()
            .setName("setup-ticket")
            .setDescription("Setup Ticket System")

            .addChannelOption(option =>
                option
                .setName("channel")
                .setDescription("Channel-ka ticket panel")
                .setRequired(true)
            )

            .addStringOption(option =>
                option
                .setName("message")
                .setDescription("Farinta panel-ka")
                .setRequired(true)
            )

            .addStringOption(option =>
                option
                .setName("button")
                .setDescription("Magaca button-ka")
                .setRequired(true)
            )

            .addStringOption(option =>
                option
                .setName("ticketmessage")
                .setDescription("Farinta ticket-ka cusub")
                .setRequired(true)
            )

            .setDefaultMemberPermissions(
                PermissionsBitField.Flags.Administrator
            )
            .toJSON()

    ];


    await client.application.commands.set(commands);

    console.log("Commands Registered");
});


// =====================
// Login
// =====================
client.login(process.env.TOKEN);
