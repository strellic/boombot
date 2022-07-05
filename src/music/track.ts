import {
  AudioResource,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import { downloadOptions } from "ytdl-core";
import ytdlDiscord from "discord-ytdl-core";

import log from "../utils/log";
import type { MediaInfo } from "./info";

/**
 * This is the data required to create a Track object.
 */
export interface TrackData extends MediaInfo {
  onStart: () => void;
  onFinish: () => void;
  onError: (error: Error) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

/**
 * A Track represents information about a YouTube video (in this context)
 * that can be added to a queue.
 * It contains the title and URL of the video,
 * as well as functions onStart, onFinish, onError, that act
 * as callbacks that are triggered at certain points during the
 * track's lifecycle.
 *
 * Rather than creating an AudioResource for each video immediately
 * and then keeping those in a queue,
 * we use tracks as they don't pre-emptively load the
 * videos. Instead, once a Track is taken from the
 * queue, it is converted into an AudioResource
 * just in time for playback.
 */
export class Track implements TrackData {
  public readonly url: string;

  public readonly title: string;

  public readonly duration?: number;

  public readonly author: string;

  public readonly type: "youtube" | "direct";

  public readonly startTime: number;

  public readonly customFFmpegArgs?: string[];

  public readonly onStart: () => void;

  public readonly onFinish: () => void;

  public readonly onError: (error: Error) => void;

  private constructor({
    url,
    title,
    duration,
    author,
    startTime,
    customFFmpegArgs,
    type,
    onStart,
    onFinish,
    onError,
  }: TrackData) {
    this.url = url;
    this.title = title;
    this.duration = duration;
    this.author = author;
    this.type = type as "youtube" | "direct";

    this.startTime = startTime || 0;

    if (customFFmpegArgs) this.customFFmpegArgs = customFFmpegArgs;

    this.onStart = onStart;
    this.onFinish = onFinish;
    this.onError = onError;
  }

  /**
   * Creates an AudioResource from this Track.
   */
  public async createAudioResource(): Promise<AudioResource<Track>> {
    log.debug(`Playing track: ${this.title}`);

    let stream;
    const encoderArgs = this.customFFmpegArgs || [];

    if (this.type === "youtube") {
      const options = {
        quality: "highestaudio",
        filter: "audioonly",
        highWaterMark: 33554432, // 1 << 25
      } as downloadOptions;

      if (this.startTime !== 0) {
        options.begin = this.startTime * 1000;
      }

      stream = ytdlDiscord(this.url, {
        ...options,
        opusEncoded: true,
        seek: this.startTime,
        encoderArgs,
      });
    } else {
      stream = ytdlDiscord.arbitraryStream(this.url, {
        opusEncoded: true,
        seek: this.startTime,
        encoderArgs,
      });
    }

    return createAudioResource(stream, {
      inputType: StreamType.Opus,
      metadata: this,
    });
  }

  /**
   * Creates a Track from a MediaInfo and lifecycle callback methods.
   *
   * @param url The URL of the video
   * @param methods Lifecycle callbacks
   *
   * @returns The created Track
   */
  public static from(
    info: MediaInfo,
    methods: Pick<Track, "onStart" | "onFinish" | "onError">
  ): Track {
    const wrappedMethods = {
      onStart() {
        wrappedMethods.onStart = noop;
        methods.onStart();
      },
      onFinish() {
        wrappedMethods.onFinish = noop;
        methods.onFinish();
      },
      onError(error: Error) {
        wrappedMethods.onError = noop;
        methods.onError(error);
      },
    };

    return new Track({
      ...info,
      ...wrappedMethods,
    });
  }
}
