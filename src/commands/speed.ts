import { SlashCommandBuilder } from "@discordjs/builders";

import type CustomClient from "../utils/state";
import type { CustomCommandInteraction } from "../utils/helpers";
import voice from "../utils/voice";

export default {
  data: new SlashCommandBuilder()
    .setName("speed")
    .setDescription("Sets a custom speed to the currently playing song.")
    .addStringOption((option) =>
      option
        .setName("speed")
        .setDescription("The speed multiplier (ex: 1.5)")
        .setRequired(true)
    ),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const speed: string | null = interaction.options.getString("speed");
    if (!speed) {
      await interaction.reply({
        content: "Missing speed multiplier.",
        ephemeral: true,
      });
      return;
    }

    const multiplier = parseFloat(speed);
    if (Number.isNaN(multiplier)) {
      await interaction.reply({
        content: "Invalid speed multiplier!",
        ephemeral: true,
      });
      return;
    }

    if (multiplier < 0.5 || multiplier > 2.0) {
      await interaction.reply({
        content: "The speed multiplier must be in the range [0.5, 2.0].",
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

      const startTime =
        (new Date().getTime() - (subscription.lastStartTime?.getTime() || 0)) /
        1000 / multiplier;

      await voice.queue(subscription, track, interaction.user.username, {
        insertFront: true,
        startTime,
        customFFmpegArgs: ["-filter:a", `atempo=${multiplier}`],
        hideInsertMessages: true,
      });
      subscription.audioPlayer.stop();
      await interaction.reply(
        `Playing **${track.title}** at **${multiplier}x** speed...`
      );
    } else {
      await interaction.reply({
        content: "Not playing in this server!",
        ephemeral: true,
      });
    }
  },
};
