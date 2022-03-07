import discord from "discord.js";

import config from "./config";
import CustomClient from "./utils/state";
import log from "./utils/log";
import type {
  CustomInteraction,
  CustomCommandInteraction,
} from "./utils/helpers";

if (!config.init()) {
  log.error("Missing required configuration options, exiting...");
  process.exit(1);
}

const bot = new CustomClient({
  intents: [
    discord.Intents.FLAGS.GUILDS,
    discord.Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

bot.once("ready", async () => {
  await bot.initCommands();
  log.info("BoomBot ready!");
});

bot.on("interactionCreate", async (baseInteraction: discord.Interaction) => {
  if (
    !baseInteraction.user ||
    !baseInteraction.guild ||
    !baseInteraction.member
  ) {
    log.info(baseInteraction);
    return;
  }

  const interaction: CustomInteraction = baseInteraction as CustomInteraction;

  const { user } = interaction;
  const data = bot.getUserData(user.id);

  if (interaction.isCommand()) {
    const cmdInteraction = interaction as CustomCommandInteraction;

    const command = bot.data.commands.get(cmdInteraction.commandName);
    if (!command) {
      log.warn(`Command not found: ${cmdInteraction.commandName}`);
      return;
    }

    try {
      await command.execute(bot, cmdInteraction);
    } catch (error) {
      log.error(error);
      await cmdInteraction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }

  if (interaction.isSelectMenu() || interaction.isButton()) {
    const deferrable = data.interactions.get(interaction.message.id);
    if (deferrable) {
      deferrable.resolve({ timeout: false, result: interaction });
    }
  }
});

setInterval(() => {
  if (bot) {
    bot.data.subscriptions.forEach((s) => s.inactivityCheck());
  }
}, 5000);

bot.login(config.token);
