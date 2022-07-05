import discord from "discord.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  entersState,
  VoiceConnection,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
  VoiceConnectionState,
  AudioPlayerState,
  AudioPlayerError,
} from "@discordjs/voice";
import { promisify } from "node:util";
import type { Track } from "./track";

import type CustomClient from "../utils/state";

const wait = promisify(setTimeout);

/**
 * A MusicSubscription exists for each active VoiceConnection.
 * Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and
 * voice connection for error handling and reconnection logic.
 */
class MusicSubscription {
  public readonly voiceConnection: VoiceConnection;

  public readonly audioPlayer: AudioPlayer;

  public readonly outputChannel: discord.TextChannel;

  public queue: Track[];

  public track: Track | undefined;

  public queueLock = false;

  public readyLock = false;

  public lastPlayTime: Date | null;

  public lastStartTime: Date | null;

  public creationTime: Date;

  public paused: Boolean;

  public client: CustomClient;

  public constructor(
    client: CustomClient,
    voiceConnection: VoiceConnection,
    outputChannel: discord.TextChannel
  ) {
    this.voiceConnection = voiceConnection;
    this.outputChannel = outputChannel;
    this.audioPlayer = createAudioPlayer();
    this.queue = [];
    this.track = undefined;

    this.lastPlayTime = null;
    this.lastStartTime = null;
    this.creationTime = new Date();

    this.paused = false;

    this.client = client;

    this.voiceConnection.on(
      "stateChange",
      async (oldState: VoiceConnectionState, state: VoiceConnectionState) => {
        if (state.status === VoiceConnectionStatus.Disconnected) {
          if (
            state.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
            state.closeCode === 4014
          ) {
            /**
             * If the WebSocket closed with a 4014 code, this means that we should not
             * manually attempt to reconnect, but there is a chance the connection will
             * recover itself if the reason of the disconnect was due to switching voice
             * channels. This is also the same code for the bot being kicked from the voice
             * channel, so we allow 5 seconds to figure out which scenario it is. If the
             * bot has been kicked, we should destroy the voice connection.
             */
            try {
              await entersState(
                this.voiceConnection,
                VoiceConnectionStatus.Connecting,
                5_000
              );
              // Probably moved voice channel
            } catch {
              this.voiceConnection.destroy();
              // Probably removed from voice channel
            }
          } else if (this.voiceConnection.rejoinAttempts < 5) {
            /**
             * The disconnect in this case is recoverable, and we also have
             * <5 repeated attempts so we will reconnect.
             */
            await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
            this.voiceConnection.rejoin();
          } else {
            /**
             * The disconnect in this case may be recoverable, but
             * we have no more remaining attempts - destroy.
             */
            this.voiceConnection.destroy();
          }
        } else if (state.status === VoiceConnectionStatus.Destroyed) {
          /**
           * Once destroyed, stop the subscription.
           */
          this.stop();
        } else if (
          !this.readyLock &&
          (state.status === VoiceConnectionStatus.Connecting ||
            state.status === VoiceConnectionStatus.Signalling)
        ) {
          /**
           * In the Signalling or Connecting states, we set a 20 second time
           * limit for the connection to become ready before destroying the
           * voice connection. This stops the voice connection permanently
           * existing in one of these states.
           */
          this.readyLock = true;
          try {
            await entersState(
              this.voiceConnection,
              VoiceConnectionStatus.Ready,
              20_000
            );
          } catch {
            if (
              this.voiceConnection.state.status !==
              VoiceConnectionStatus.Destroyed
            ) {
              this.voiceConnection.destroy();
            }
          } finally {
            this.readyLock = false;
          }
        }
      }
    );

    // Configure audio player
    this.audioPlayer.on(
      "stateChange",
      (oldState: AudioPlayerState, state: AudioPlayerState) => {
        if (
          state.status === AudioPlayerStatus.Idle &&
          oldState.status !== AudioPlayerStatus.Idle
        ) {
          // If the Idle state is entered from a non-Idle state,
          // it means that an audio resource has finished playing.
          // The queue is then processed to start playing the next track, if one is available.
          (oldState.resource as AudioResource<Track>).metadata.onFinish();
          this.processQueue();
        } else if (state.status === AudioPlayerStatus.Playing) {
          // If the Playing state has been entered, then a new track has started playback.
          (state.resource as AudioResource<Track>).metadata.onStart();
        }
      }
    );

    this.audioPlayer.on("error", (error: AudioPlayerError) =>
      (error.resource as AudioResource<Track>).metadata.onError(error)
    );

    voiceConnection.subscribe(this.audioPlayer);
  }

  /**
   * Adds a new Track to the queue.
   *
   * @param track The track to add to the queue
   */
  public async enqueue(track: Track) {
    this.queue.push(track);
    await this.processQueue();
  }

  public async insertFront(track: Track) {
    this.queue.unshift(track);
    await this.processQueue();
  }

  public async insert(track: Track, index: number) {
    this.queue.splice(index, 0, track);
    await this.processQueue();
  }

  public async skipQueueTo(index: number) {
    this.queue = this.queue.slice(index);
    await this.processQueue();
  }

  public async remove(index: number): Promise<Track | undefined> {
    const removed = this.queue.splice(index, 1);
    await this.processQueue();
    if (removed.length === 1) {
      return removed[0];
    }
    return undefined;
  }

  /**
   * Stops audio playback and empties the queue.
   */
  public stop() {
    this.queueLock = true;
    this.queue = [];
    this.audioPlayer.stop(true);
  }

  /**
   * Attempts to play a Track from the queue.
   */
  private async processQueue(): Promise<void> {
    // If the queue is locked (already being processed), is empty,
    // or the audio player is already playing something, return
    if (
      this.queueLock ||
      this.audioPlayer.state.status !== AudioPlayerStatus.Idle ||
      this.queue.length === 0
    ) {
      return;
    }
    // Lock the queue to guarantee safe access
    this.queueLock = true;

    // Take the first item from the queue. This is guaranteed to exist
    // due to the non-empty check above.
    this.track = this.queue.shift();
    if (!this.track) {
      return;
    }

    this.lastPlayTime = new Date();
    this.lastStartTime = new Date();

    try {
      // Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
      const resource = await this.track.createAudioResource();
      this.audioPlayer.play(resource);
      this.queueLock = false;
    } catch (error) {
      // If an error occurred, try the next item of the queue instead
      this.track.onError(error as Error);
      this.queueLock = false;
      this.processQueue();
    }
  }

  public inactivityCheck() {
    const time = new Date().getTime();
    const createdAt = this.creationTime.getTime();

    const ONE_MIN = 60000;

    if (
      this.audioPlayer.state.status === AudioPlayerStatus.Playing ||
      this.queue.length !== 0
    ) {
      this.lastPlayTime = new Date();
      return;
    }

    if (time > createdAt + ONE_MIN) {
      if (!this.lastPlayTime) {
        this.voiceConnection.destroy();
        this.client.data.subscriptions.delete(this.outputChannel.guild.id);
        this.outputChannel.send("Disconnecting due to inactivity...");
      } else {
        const lastPlayAt = this.lastPlayTime.getTime();

        const minutes = this.paused ? 8 : 4;

        if (time > lastPlayAt + minutes * ONE_MIN) {
          this.voiceConnection.destroy();
          this.client.data.subscriptions.delete(this.outputChannel.guild.id);
          this.outputChannel.send("Disconnecting due to inactivity...");
        }
      }
    }
  }
}

export default MusicSubscription;
