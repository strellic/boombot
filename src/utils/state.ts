import discord from 'discord.js';

import type { Command } from '../commands';
import commands from '../commands';
import MusicSubscription from '../music/subscription';
import log from './log';

import { Deferred } from './deferred';
import type { CustomInteraction } from './helpers';

interface UserData {
  interactions: discord.Collection<string, Deferred<CustomInteraction>>
}

interface GlobalData {
  commands: discord.Collection<string, Command>
  users: discord.Collection<string, UserData>
  subscriptions: discord.Collection<discord.Snowflake, MusicSubscription>
}

class CustomClient extends discord.Client {
  public data: GlobalData;

  constructor(options: discord.ClientOptions) {
    super(options);
    this.data = {
      commands: new discord.Collection(),
      users: new discord.Collection(),
      subscriptions: new discord.Collection()
    };
  }

  async initCommands() {
    log.debug('Initializing commands...');
    await commands.init(this.data.commands);
    commands.deploy();
  }

  getUserData(userId: string): UserData {
    const stored = this.data.users.get(userId);
    if (!stored) {
      const data: UserData = {
        interactions: new discord.Collection()
      };
      this.data.users.set(userId, data);
      return data;
    }
    return stored;
  }

  deferInteraction(userId: string, msgId: string, timeout = 15) {
    const data = this.getUserData(userId);
    const deferrable = new Deferred<CustomInteraction>({
      onResolve: () => data.interactions.delete(msgId),
      timeout
    });
    data.interactions.set(msgId, deferrable);
    return deferrable;
  }
}

export default CustomClient;
