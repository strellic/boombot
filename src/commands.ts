import discord from "discord.js";
import { REST } from "@discordjs/rest";
import builders from "@discordjs/builders";
import { Routes } from "discord-api-types/v9";
import fs from "fs";

import type CustomClient from "./utils/state";
import config from "./config";
import log from "./utils/log";

interface Command {
  data: builders.SlashCommandBuilder;
  execute(
    client: CustomClient,
    interaction: discord.CommandInteraction
  ): Promise<void>;
}

const commandFiles = fs
  .readdirSync("./src/commands/")
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
const commands: Command[] = [];

const init = async (collection: discord.Collection<string, Command>) => {
  const promises: Promise<any>[] = [];
  commandFiles.forEach((file) => promises.push(import(`./commands/${file}`)));

  const modules: Command[] = (await Promise.all(promises)).map(
    (m: any) => m.default
  );
  modules.forEach((cmd) => {
    commands.push(cmd);
    collection.set(cmd.data.name, cmd);
  });
};

const deploy = async () => {
  const rest = new REST({ version: "9" }).setToken(config.token);
  const body = commands.map((c) => c.data.toJSON());

  let route = Routes.applicationCommands(config.clientId);
  if (config.development && config.devGuildId) {
    route = Routes.applicationGuildCommands(config.clientId, config.devGuildId);
  }

  /*
  const DELETE_NAME = 'add';
  rest.get(Routes.applicationGuildCommands(config.clientId, config.devGuildId!))
    .then((data: any) => {
      const item = data.find((d: any) => d.name === DELETE_NAME);
      if (item) {
        const base = Routes.applicationGuildCommands(config.clientId, config.devGuildId!);
        rest.delete(`${base}/${item.id}`);
        log.info(`Deleted command "${DELETE_NAME}" successfully!`);
      }
    });
 */

  await rest.put(route, { body }).catch(log.error);
  log.info("Commands deployed!");
};

export type { Command };
export default { init, deploy };
