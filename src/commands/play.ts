import discord from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';

import type CustomClient from '../utils/state';
import type { CustomCommandInteraction } from '../utils/helpers';
import helpers from '../utils/helpers';
import voice from '../utils/voice';
import info from '../music/info';
import type { MediaInfo } from '../music/info';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song by URL')
    .addStringOption((option) => option.setName('url')
      .setDescription('The URL to play')
      .setRequired(true))
    .addNumberOption((option) => option.setName('number')
      .setDescription('An optional number for the position to insert the song at in the queue')
      .setRequired(false)),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    let url: string | null = interaction.options.getString('url');
    if (!url) {
      await interaction.reply({ content: 'Missing search url.', ephemeral: true });
      return;
    }

    const number: number | null = interaction.options.getNumber('number');
    if (number !== null && (Number.isNaN(number) || number <= 0)) {
      await interaction.reply({ content: 'The insert number must be a positive number.', ephemeral: true });
      return;
    }

    let id;
    let playlistId;
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('no shot');
      }

      if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
        id = urlObj.pathname.split('/').pop();
      } else if (urlObj.host === 'youtube.com' || urlObj.host === 'www.youtube.com') {
        if (urlObj.pathname === '/watch') {
          id = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.startsWith('/shorts/')) {
          id = urlObj.pathname.split('/').pop();
        } else if (urlObj.pathname === '/playlist') {
          playlistId = urlObj.searchParams.get('list');
        }
      }
    } catch (err) {
      await interaction.reply({ content: 'Invalid URL!', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let trackInfo: MediaInfo | undefined;
    let playlist: ytpl.Result | undefined;
    let playlistInfo: MediaInfo[] | undefined;
    if (id) {
      url = `https://youtube.com/watch?v=${encodeURIComponent(id)}`;
      try {
        trackInfo = info.ytdlToInfo(await ytdl.getInfo(url));
      } catch (err) {
        await interaction.followUp('Invalid video ID!');
        return;
      }
    } else if (playlistId) {
      url = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
      try {
        playlist = await ytpl(url, { pages: Infinity });
        playlistInfo = playlist.items.map(info.ytplToInfo);
        if (!playlistInfo || playlistInfo.length === 0) {
          await interaction.followUp('Invalid playlist ID!');
          return;
        }
      } catch (err) {
        await interaction.followUp('Invalid playlist ID!');
        return;
      }
    } else {
      const ext = helpers.urlToExtension(url);
      const allowedExtensions = ['mp3', 'wav', 'flac', 'aac'];
      if (!ext || !allowedExtensions.includes(ext)) {
        await interaction.followUp(
          `Invalid file extension. Supported extensions: ${allowedExtensions.join(', ')}`
        );
        return;
      }
      trackInfo = info.directToInfo(url);
    }

    let subscription = client.data.subscriptions.get(interaction.guild.id);
    if (!subscription) {
      const user = await interaction.member.fetch() as discord.GuildMember;
      const voiceChannel = await user.voice.channel;

      if (!voiceChannel) {
        await interaction.followUp('Please join a voice channel first!');
        return;
      }

      subscription = voice.createSubscription(
        client,
        voiceChannel as discord.VoiceChannel,
        interaction.channel as discord.TextChannel
      );
    }

    if (playlist && playlistInfo) {
      await interaction.followUp(`Added the playlist **${playlist.title}** to the queue!`);
      await interaction.channel.send(
        `${interaction.user.username} added the playlist **${playlist.title}** to the queue.`
      );

      if (number) {
        const options = { startIndex: number - 1 };
        voice.queueMultiple(subscription, playlistInfo, interaction.user.username, options);
      } else {
        voice.queueMultiple(subscription, playlistInfo, interaction.user.username);
      }
    } else if (trackInfo) {
      if (number) {
        const options = { startIndex: number - 1 };
        voice.queue(subscription, trackInfo, interaction.user.username, options);
      } else {
        voice.queue(subscription, trackInfo, interaction.user.username);
      }

      if (trackInfo) {
        await interaction.followUp(`Added **${trackInfo.title}** to the queue!`);
      } else {
        await interaction.followUp(`Added **${url}** to the queue!`);
      }
    }
  }
};
