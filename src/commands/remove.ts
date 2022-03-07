import { SlashCommandBuilder } from "@discordjs/builders";
import { AudioPlayerStatus } from "@discordjs/voice";

import type CustomClient from "../utils/state";
import type { CustomCommandInteraction } from "../utils/helpers";
import type MusicSubscription from "../music/subscription";

export default {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a song from the queue.")
    .addNumberOption((option) =>
      option
        .setName("number")
        .setDescription("An optional parameter to choose which song to remove")
        .setRequired(false)
    ),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    let number: number | null = interaction.options.getNumber("number");
    const subscription = client.data.subscriptions.get(
      interaction.guild.id
    ) as MusicSubscription;

    if (number === null) {
      number = 1;
    }

    if (Number.isNaN(number) || number <= 0) {
      await interaction.reply({
        content: "The number to remove must be a positive number!",
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

      const removed = await subscription.remove(number - 1);
      if (removed) {
        await interaction.reply(
          `Removed song **${removed.title}** from the queue!`
        );
      } else {
        await interaction.reply({
          content: "Could not find song to remove!",
          ephemeral: true,
        });
      }
    } else {
      await interaction.reply({
        content: "Not playing in this server!",
        ephemeral: true,
      });
    }
  },
};
