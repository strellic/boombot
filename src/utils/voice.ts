import discord from "discord.js";
import {
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
  AudioPlayerStatus,
} from "@discordjs/voice";

import MusicSubscription from "../music/subscription";
import type CustomClient from "./state";
import { Track } from "../music/track";
import type { MediaInfo } from "../music/info";
import log from "./log";

interface PlayOptions {
  startTime?: number;
  insertFront?: boolean;
  hideInsertMessages?: boolean;
  startIndex?: number;
}

const queue = async (
  subscription: MusicSubscription,
  info: MediaInfo,
  username: string,
  options?: PlayOptions
) => {
  const textChannel = subscription.outputChannel;
  const send = (msg: string) => textChannel.send(msg);

  if (subscription.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
    try {
      await entersState(
        subscription.voiceConnection,
        VoiceConnectionStatus.Ready,
        20e3
      );
    } catch (error) {
      log.warn(error);
      await send(
        "Failed to join voice channel within 20 seconds, please try again later!"
      );
      return;
    }
  }

  try {
    // Attempt to create a Track from the user's video URL
    let track: Track;
    const trackOptions = {
      onStart() {
        send(`Now playing: **${track.title}**`).catch(log.warn);
      },
      onFinish() {
        log.debug(`Finished playing track: ${track.title}`);
      },
      onError(error: Error) {
        log.warn(error);
        send(`Error: ${error.message}`).catch(log.warn);
      },
    };

    const trackInfo = info;
    if (options && options.startTime) {
      trackInfo.startTime = options.startTime;
      trackOptions.onStart = () => {};
    }

    track = Track.from(info, trackOptions);

    if (options && options.insertFront) {
      await subscription.insertFront(track);
    } else if (options && options.startIndex !== undefined) {
      await subscription.insert(track, options.startIndex);
    } else {
      await subscription.enqueue(track);
    }

    if (!options || !options.hideInsertMessages) {
      await send(`**${username}** queued song: **${track.title}**`);
    }
  } catch (error) {
    log.warn(error);

    if (!options || !options.hideInsertMessages) {
      await send("Failed to play track, please try again later!");
    }
  }
};

const queueMultiple = async (
  subscription: MusicSubscription,
  infoList: MediaInfo[],
  username: string,
  options?: PlayOptions
) => {
  const insertOptions = options || {};
  insertOptions.hideInsertMessages = true;
  insertOptions.startIndex = insertOptions.startIndex || 0;

  // dont start reprocessing the queue unless we are at the first song
  // eslint-disable-next-line no-param-reassign
  subscription.queueLock = true;

  for (let i = infoList.length - 1; i >= 0; i -= 1) {
    const info = infoList[i];
    if (i === 0) {
      // eslint-disable-next-line no-param-reassign
      subscription.queueLock = false;
    }

    // eslint-disable-next-line no-await-in-loop
    await queue(subscription, info, username, insertOptions);
  }
};

const createSubscription = (
  client: CustomClient,
  voiceChannel: discord.VoiceChannel,
  textChannel: discord.TextChannel
): MusicSubscription => {
  const subscription = new MusicSubscription(
    client,
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    }),
    textChannel
  );
  subscription.voiceConnection.on("error", (error: Error) => {
    log.warn(error);
  });
  client.data.subscriptions.set(voiceChannel.guild.id, subscription);
  return subscription;
};

export default { queue, queueMultiple, createSubscription };
