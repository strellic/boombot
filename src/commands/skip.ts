import { SlashCommandBuilder } from "@discordjs/builders";
import { AudioPlayerStatus, AudioResource } from "@discordjs/voice";

import type CustomClient from "../utils/state";
import type { CustomCommandInteraction } from "../utils/helpers";
import { Track } from "../music/track";

export default {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the currently playing song.")
    .addNumberOption((option) =>
      option
        .setName("number")
        .setDescription(
          "An optional parameter to choose how many songs to skip"
        )
        .setRequired(false)
    ),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const number: number | null = interaction.options.getNumber("number");
    const subscription = client.data.subscriptions.get(interaction.guild.id);

    if (number && (Number.isNaN(number) || number <= 0)) {
      await interaction.reply({
        content: "The number to skip must be a positive number!",
        ephemeral: true,
      });
      return;
    }

    if (subscription) {
      if (subscription.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
        await interaction.reply({
          content: "Not currently playing anything!",
          ephemeral: true,
        });
        return;
      }

      if (number && number - 1 > 0) {
        // process extra skips on the queue
        await subscription.skipQueueTo(number - 1);
      }

      subscription.audioPlayer.stop();

      if (number) {
        await interaction.reply(`Skipped to song ${number}!`);
      } else {
        await interaction.reply(`
          Skipped **${
            (subscription.audioPlayer.state.resource as AudioResource<Track>)
              .metadata.title
          }**!
        `);
      }
    } else {
      await interaction.reply({
        content: "Not playing in this server!",
        ephemeral: true,
      });
    }
  },
};
