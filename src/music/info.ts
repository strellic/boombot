import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import ytsr from 'ytsr';

import helpers from '../utils/helpers';

interface MediaInfo {
  url: string;
  title: string;
  author: string;
  type: string;

  duration?: number;
  startTime?: number;
}

const ytsrToInfo = (video: ytsr.Video): MediaInfo => ({
  url: `https://youtube.com/watch?v=${encodeURIComponent(video.id)}`,
  title: video.title,
  author: video?.author?.name || 'unknown artist',
  type: 'youtube',
  duration: video.duration ? helpers.timestampToSeconds(video.duration) : NaN
});

const ytdlToInfo = (video: ytdl.videoInfo): MediaInfo => {
  const { videoDetails } = video.player_response;
  return {
    url: `https://youtube.com/watch?v=${encodeURIComponent(videoDetails.videoId)}`,
    title: videoDetails.title,
    author: videoDetails.author,
    type: 'youtube',
    duration: Number(videoDetails.lengthSeconds)
  };
};

const ytplToInfo = (video: ytpl.Item): MediaInfo => ({
  url: `https://youtube.com/watch?v=${encodeURIComponent(video.id)}`,
  title: video.title,
  author: video.author.name,
  type: 'youtube',
  duration: video.durationSec || NaN
});

const directToInfo = (url: string): MediaInfo => ({
  url,
  title: url,
  author: 'unknown artist',
  type: 'direct',
  duration: NaN
});

export default {
  ytsrToInfo, ytdlToInfo, ytplToInfo, directToInfo
};
export type { MediaInfo };
