import discord from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import type ytsr from 'ytsr';

import type { CustomCommandInteraction } from '../utils/helpers';
import youtube from '../utils/youtube';
import type CustomClient from '../utils/state';
import info from '../music/info';
import voice from '../utils/voice';

export default {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Searches YouTube for a video')
    .addStringOption((option) => option.setName('query')
      .setDescription('The query to search for')
      .setRequired(true)),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const query: string | null = interaction.options.getString('query');
    if (!query) {
      await interaction.reply({ content: 'Missing search query.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const response = await youtube.search(query);

    const displayResults = async (videos: ytsr.Video[], pageNum = 0) => {
      const videoList = youtube.videoListGenerator(videos, pageNum);
      if (videos.length === 0 || !videoList) {
        await interaction.deleteReply();
        await interaction.followUp({ content: 'No search results found!', ephemeral: true });
        return;
      }

      const msg = await interaction.followUp(videoList);

      const { promise } = client.deferInteraction(interaction.user.id, msg.id);
      const { timeout, result } = await promise;
      await (msg as discord.Message).delete();

      if (timeout || !result) {
        await interaction.followUp({ content: 'Search timed out...', ephemeral: true });
        return;
      }

      if (result.isButton()) {
        const action = result.customId;
        const newPageNum = parseInt(action, 10);

        if (!Number.isNaN(newPageNum)) {
          displayResults(response, newPageNum);
        }
      }

      if (result.isSelectMenu()) {
        const id = result.values[0];
        const video = videos.find((v) => v.id === id);

        if (!video) {
          await result.reply({ content: 'There was an error selecting that video!', ephemeral: true });
          return;
        }

        let subscription = client.data.subscriptions.get(interaction.guild.id);
        if (!subscription) {
          const user = await result.member.fetch();
          const voiceChannel = await user.voice.channel;

          if (!voiceChannel) {
            await result.reply({ content: 'Please join a voice channel first!', ephemeral: true });
            return;
          }

          subscription = voice.createSubscription(
            client,
            voiceChannel as discord.VoiceChannel,
            interaction.channel as discord.TextChannel
          );
        }

        voice.queue(subscription, info.ytsrToInfo(video), result.user.username);
      }
    };

    displayResults(response);
  }
};
