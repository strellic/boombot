import { SlashCommandBuilder } from "@discordjs/builders";

import type CustomClient from "../utils/state";
import type { CustomCommandInteraction } from "../utils/helpers";
import voice from "../utils/voice";

export default {
  data: new SlashCommandBuilder()
    .setName("nightcore")
    .setDescription("Makes the currently playing song nightcore.")
    .addStringOption((option) =>
      option
        .setName("rate")
        .setDescription("A custom nightcore rate (default: 1.5)")
        .setRequired(false)
    ),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const rate: string | null = interaction.options.getString("rate");

    let multiplier = 1.5;
    if (rate) {
      multiplier = parseFloat(rate);
      if (Number.isNaN(multiplier)) {
        await interaction.reply({
          content: "Invalid rate!",
          ephemeral: true,
        });
        return;
      }

      if (multiplier < 0.5 || multiplier > 2.0) {
        await interaction.reply({
          content: "The rate must be in the range [0.5, 2.0].",
          ephemeral: true,
        });
        return;
      }
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
        customFFmpegArgs: [
          "-filter:a",
          `rubberband=pitch=${multiplier},rubberband=tempo=${multiplier}`,
        ],
        hideInsertMessages: true,
      });
      subscription.audioPlayer.stop();

      if (multiplier === 1.5) {
        await interaction.reply(
          `Playing **${track.title}** in **nightcore**...`
        );
      } else {
        await interaction.reply(
          `Playing **${track.title}** in **nightcore** (custom rate: **${multiplier}x**)...`
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
