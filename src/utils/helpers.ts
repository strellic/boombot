import discord from "discord.js";

interface CustomInteractionBase {
  guild: discord.Guild;
  user: discord.User;
  member: discord.GuildMember;
  channel: discord.Channel;
}

type CustomInteraction = CustomInteractionBase & discord.Interaction;
type CustomCommandInteraction = CustomInteractionBase &
  discord.CommandInteraction;

const urlToExtension = (url: string) =>
  url.split(/[#?]/)?.[0]?.split(".")?.pop()?.trim();
const timestampToSeconds = (timestamp: string) => {
  const sections = timestamp.split(":").map(Number);
  if (sections.length === 3) {
    return sections[0] * 3600 + sections[1] * 60 + sections[2];
  }
  if (sections.length === 2) {
    return sections[0] * 60 + sections[1];
  }
  return sections[0];
};

export type { CustomInteraction, CustomCommandInteraction };
export default { urlToExtension, timestampToSeconds };
