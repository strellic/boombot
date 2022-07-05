import { SlashCommandBuilder } from "@discordjs/builders";

import type CustomClient from "../utils/state";
import type { CustomCommandInteraction } from "../utils/helpers";
import type MusicSubscription from "../music/subscription";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription(
      "Toggles whether the currently playing song is paused or playing."
    ),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const subscription = client.data.subscriptions.get(
      interaction.guild.id
    ) as MusicSubscription;

    if (subscription) {
      if (subscription.paused) {
        subscription.audioPlayer.unpause();
        await interaction.reply(`Unpaused the currently playing song!`);
      } else {
        subscription.audioPlayer.pause();
        await interaction.reply(`Paused the currently playing song!`);
      }
      subscription.paused = !subscription.paused;
    } else {
      await interaction.reply({
        content: "Not playing in this server!",
        ephemeral: true,
      });
    }
  },
};
