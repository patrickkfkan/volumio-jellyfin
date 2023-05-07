import Server from '../entities/Server';
import jellyfin from '../JellyfinContext';

// An item in the `servers` array stored in plugin config.
export interface ServerConfEntry {
  url: string;
  username: string;
  password: string;
}

export default class ServerHelper {

  static getServersFromConfig(): ServerConfEntry[] {
    return jellyfin.getConfigValue<ServerConfEntry[]>('servers', [], true);
  }

  static fetchPasswordFromConfig(server: Server, username: string): string {
    const serverConfEntries = this.getServersFromConfig();
    const serverConf = serverConfEntries.find((conf) => conf.url === server.url && conf.username === username);
    return serverConf?.password || '';
  }

  static getConnectionUrl(url: string): string {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      urlObj.hostname = jellyfin.getDeviceInfo().host;
    }
    const sanitized = urlObj.toString();
    if (sanitized.endsWith('/')) {
      return sanitized.substring(0, sanitized.length - 1);
    }
    return sanitized;
  }
}
