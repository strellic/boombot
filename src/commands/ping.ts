import { SlashCommandBuilder } from '@discordjs/builders';

import type CustomClient from '../utils/state';
import type { CustomCommandInteraction } from '../utils/helpers';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    await interaction.reply('Pong!');
  }
};
