import discord, { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';

import { Track } from '../music/track';
import type CustomClient from '../utils/state';
import type { CustomCommandInteraction } from '../utils/helpers';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  return [
    h ? `${h}h` : null,
    m > 9 ? `${m}m` : `${h ? `0${m}` : m || '0'}m`,
    s > 9 ? `${s}s` : `0${s}s`
  ].filter(Boolean).join(' ');
}

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Lists queued songs.'),
  async execute(client: CustomClient, interaction: CustomCommandInteraction) {
    const subscription = client.data.subscriptions.get(interaction.guild.id);

    if (subscription) {
      const current = subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
        ? 'Nothing is currently playing!'
        : `Currently playing:\n**${(subscription.audioPlayer.state.resource as AudioResource<Track>).metadata.title}**`;

      await interaction.deferReply();

      const PAGE_LEN = 10;
      const showQueue = async (page = 0) => {
        let start = page * PAGE_LEN;
        let end = start + PAGE_LEN;

        const { queue } = subscription;
        const components = [];

        if (start >= queue.length) {
          start = 0;
          end = start + PAGE_LEN;
        }

        if (start > 0 || end < queue.length) {
          const pageBtn = new discord.MessageActionRow();
          const pageBtnComponents = [];

          if (start > 0) {
            pageBtnComponents.push(
              new discord.MessageButton()
                .setCustomId(`${page - 1}`)
                .setLabel('🡰 Previous')
                .setStyle('PRIMARY')
            );
          }
          if (end < queue.length) {
            pageBtnComponents.push(
              new discord.MessageButton()
                .setCustomId(`${page + 1}`)
                .setLabel('Next 🡲')
                .setStyle('DANGER')
            );
          }

          pageBtn.addComponents(...pageBtnComponents);
          components.push(pageBtn);
        }

        const queuedFields = queue
          .slice(start, end)
          .map((track, i) => ({
            name: `${i + start + 1}. ${track.title}`,
            value: track.author && track.duration
              ? `${track.author} - ${formatTime(track.duration)}`
              : 'external audio file'
          }));

        const queueEmbed = new MessageEmbed()
          .setTitle(`Queue (${subscription.queue.length} songs)`)
          .setDescription(current)
          .addFields(
            ...queuedFields
          );

        const msg = await interaction.followUp({
          embeds: [queueEmbed], components
        }) as discord.Message;
        if (components.length === 0) {
          return;
        }

        const { promise } = client.deferInteraction(interaction.user.id, msg.id);
        const { timeout, result } = await promise;

        if (timeout || !result) {
          await msg.edit({ components: [] });
          return;
        }

        if (result.isButton()) {
          const action = result.customId;
          const newPageNum = Number(action);
          await (msg as discord.Message).delete();

          if (!Number.isNaN(newPageNum)) {
            showQueue(newPageNum);
          }
        }
      };

      showQueue(0);
    } else {
      await interaction.reply({ content: 'Not playing in this server!', ephemeral: true });
    }
  }
};
