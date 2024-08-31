const {
  Client,
  Events,
  GatewayIntentBits,
  ActivityType,
  Collection,
  Partials,
  WebhookClient,
} = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const dotenv = require("dotenv");
const fs = require("node:fs");
const path = require("node:path");
const { Player } = require("discord-player");
const {
  SpotifyExtractor,
  SoundCloudExtractor,
  YoutubeExtractor,
} = require("@discord-player/extractor");
const { cyanBright, gray } = require("colorette");

require("dotenv").config();

const token = process.env.token;
const clientId = process.env.clientId;
const guildId = process.env.guildId;
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
  presence: {
    status: "online",
    activities: [
      {
        name: "TITO STINKY",
        type: ActivityType.Playing,
      },
    ],
  },
});
client.commands = new Collection();

client.player = new Player(client, {
  deafenOnJoin: true,
  lagMonitor: 1000,
});

client.player.extractors.register(YoutubeExtractor, {});
client.player.events.on("playerStart", (queue, track) =>
  queue.metadata.channel.send(`🎶 | Now playing **${track.title}**!`)
);
client.player.events.on("error", (queue, error) =>
  console.log(
    `[${queue.guild.name}] Error emitted from the queue: ${error.message}`
  )
);
client.player.events.on("debug", (_queue, message) =>
  console.log(`[${cyanBright("DEBUG")}] ${gray(message)}\n`)
);

const commands = [];

client.login(token);

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST().setToken(token);
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}
