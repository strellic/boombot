import discord from "discord.js";
import ytsr from "ytsr";

const search = async (query: string) => {
  const results = await ytsr(query, { limit: 15 });
  const videos = results.items.filter(
    (i) => i.type === "video"
  ) as ytsr.Video[];
  return videos;
};

const videoToEmbed = (video: ytsr.Video): discord.MessageEmbed => {
  const embed = new discord.MessageEmbed();

  embed.setTitle(video.title || "NO TITLE");

  embed.setURL(`https://youtube.com/watch?v=${encodeURIComponent(video.id)}`);

  if (video.author) {
    if (video.uploadedAt) {
      embed.setDescription(`${video.author.name} - ${video.uploadedAt}`);
    } else {
      embed.setDescription(video.author.name);
    }
  }

  const thumbnail = video.thumbnails.pop();
  if (thumbnail && thumbnail.url) {
    embed.setImage(thumbnail.url);
  }

  return embed;
};

const videosToEmbed = (items: ytsr.Video[]) => {
  const embeds: discord.MessageEmbed[] = [];
  const options: discord.MessageSelectOptionData[] = [];

  items.forEach((item) => {
    if (item) {
      const embed = videoToEmbed(item);
      if (embed && embed.title && embed.url) {
        embeds.push(embed);
        options.push({ label: embed.title, value: item.id });
      }
    }
  });

  const selectRow = new discord.MessageActionRow().addComponents(
    new discord.MessageSelectMenu()
      .setCustomId("select")
      .setPlaceholder("Select a video")
      .addOptions(options)
  );

  const components = [selectRow];

  return { embeds, components };
};

const PAGE_LEN = 5;
const videoListGenerator = (videos: ytsr.Video[], page = 0) => {
  if (videos.length === 0) {
    return null;
  }

  const start = page * PAGE_LEN;
  const end = start + PAGE_LEN;

  const { embeds, components } = videosToEmbed(videos.slice(start, end));

  if (start > 0 || end < videos.length) {
    const pageBtn = new discord.MessageActionRow();
    const pageBtnComponents = [];

    if (start > 0) {
      pageBtnComponents.push(
        new discord.MessageButton()
          .setCustomId(`${page - 1}`)
          .setLabel("🡰 Previous")
          .setStyle("PRIMARY")
      );
    }
    if (end < videos.length) {
      pageBtnComponents.push(
        new discord.MessageButton()
          .setCustomId(`${page + 1}`)
          .setLabel("Next 🡲")
          .setStyle("DANGER")
      );
    }

    pageBtn.addComponents(...pageBtnComponents);
    components.push(pageBtn);
  }

  return { embeds, components };
};

export default { search, videoListGenerator };
