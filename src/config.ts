import dotenv from 'dotenv';
import log from './utils/log';

dotenv.config();

interface Config {
    token: string,
    clientId: string,

    development: boolean,
    devGuildId?: string,

    init: () => boolean
}

const config: Config = {
  token: '',
  clientId: '',
  development: false,
  init: (): boolean => {
    if (!process.env.TOKEN) {
      log.error('Missing bot token! Set the "TOKEN" environment variable.');
      return false;
    }
    config.token = process.env.TOKEN;

    if (!process.env.CLIENT_ID) {
      log.error('Missing bot client id! Set the "CLIENT_ID" environment variable.');
      return false;
    }
    config.clientId = process.env.CLIENT_ID;

    if (process.env.DEVELOPMENT && process.env.DEVELOPMENT === 'true') {
      if (process.env.DEVELOPMENT_TEST_GUILD) {
        log.debug('Development mode: on');
        config.development = true;
        config.devGuildId = process.env.DEVELOPMENT_TEST_GUILD;
      } else {
        log.error('Development mode is on, but the test guild id is missing! Set the "DEVELOPMENT_TEST_GUILD" environment variable.');
        return false;
      }
    }

    return true;
  }
};

export default config;
