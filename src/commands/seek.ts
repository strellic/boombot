import { SlashCommandBuilder } from "@discordjs/builders";

import type CustomClient from "../utils/state";
import type { CustomCommandInteraction } from "../utils/helpers";
import type { PlayOptions } from "../utils/voice";
import voice from "../utils/voice";
import helpers from "../utils/helpers";

export default {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Seeks to a time in the currently playing song.")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("The time to seek to (ex: 1:30)")
        .setRequired(true)
    ),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const time: string | null = interaction.options.getString("time");
    if (!time) {
      await interaction.reply({
        content: "Missing time to seek to.",
        ephemeral: true,
      });
      return;
    }

    const secs = helpers.timestampToSeconds(time);
    if (Number.isNaN(secs)) {
      await interaction.reply({
        content: "Invalid timestamp! Timestamp should be of the form MM:SS.",
        ephemeral: true,
      });
      return;
    }

    const subscription = client.data.subscriptions.get(interaction.guild.id);

    if (subscription) {
      const { track } = subscription;
      if (!track) {
        await interaction.reply("No song is currently playing!");
        return;
      }

      const playOptions: PlayOptions = {
        insertFront: true,
        hideInsertMessages: true,
        startTime: secs,
      };

      if (secs === 0) {
        // idk
        playOptions.startTime = 0.01;
      }

      await voice.queue(
        subscription,
        track,
        interaction.user.username,
        playOptions
      );
      subscription.audioPlayer.stop();

      if (time.includes(":")) {
        await interaction.reply(
          `Seeking in **${track.title}** to **${time}**...`
        );
      } else {
        await interaction.reply(
          `Seeking in **${track.title}** to **${time}s**...`
        );
      }
    } else {
      await interaction.reply({
        content: "Not playing in this server!",
        ephemeral: true,
      });
    }
  },
};
