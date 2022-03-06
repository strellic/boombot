import { SlashCommandBuilder } from '@discordjs/builders';

import type CustomClient from '../utils/state';
import type { CustomCommandInteraction } from '../utils/helpers';

export default {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leaves a voice channel!'),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const subscription = client.data.subscriptions.get(interaction.guild.id);

    if (subscription) {
      subscription.voiceConnection.destroy();
      client.data.subscriptions.delete(interaction.guild.id);
      await interaction.reply('Goodbye!');
    } else {
      await interaction.reply({ content: 'Not playing in this server!', ephemeral: true });
    }
  }
};
