import EventEmitter from 'events';
import { ClientInfo, DeviceInfo, Jellyfin as JellyfinSdk } from '@jellyfin/sdk';
import ServerConnection from './ServerConnection';
import Server from '../entities/Server';
import jellyfin from '../JellyfinContext';
import ServerHelper from '../util/ServerHelper';
import { v4 as uuidv4 } from 'uuid';

export interface PasswordFetch {
  (server: Server, username: string): string;
}

export interface JellyfinSdkInitInfo {
  clientInfo: ClientInfo;
  deviceInfo: DeviceInfo;
}

export default class ConnectionManager extends EventEmitter {

  #sdkInitInfo: JellyfinSdkInitInfo;
  #connections: ServerConnection[];
  #authenticatingPromises: Record<ServerConnection['id'], Promise<ServerConnection>>;

  constructor(sdkInitInfo: JellyfinSdkInitInfo) {
    super();
    this.#sdkInitInfo = sdkInitInfo;
    this.#connections = [];
    this.#authenticatingPromises = {};
  }

  async getAuthenticatedConnection(server: Server, username: string, passwordFetch: PasswordFetch): Promise<ServerConnection> {
    const conn = this.#getOrCreateConnection(server, username);
    if (conn.auth) {
      return conn;
    }
    
    if (Reflect.has(this.#authenticatingPromises, conn.id)) {
      jellyfin.getLogger().info('[jellyfin-conn] Returning existing auth promise');
      return this.#authenticatingPromises[conn.id];
    }

    this.#authenticatingPromises[conn.id] = this.#authenticateConnection(conn, passwordFetch)
      .finally(() => { delete this.#authenticatingPromises[conn.id]; });
    
    return this.#authenticatingPromises[conn.id];
  }

  async #authenticateConnection(connection: ServerConnection, passwordFetch: PasswordFetch): Promise<ServerConnection> {
    const {server, username} = connection;
    jellyfin.toast('info', jellyfin.getI18n('JELLYFIN_LOGGING_INTO', server.name));
    try {
      const authResult = await connection.api.authenticateUserByName(username, passwordFetch(server, username));
      connection.auth = authResult.data;
      jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_LOGIN_SUCCESS', server.name));
      jellyfin.getLogger().info(`[jellyfin-conn] Login successful: ${username}@${server.name}`);
    }
    catch (error: any) {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_AUTH_FAILED'));
      jellyfin.getLogger().error(`[jellyfin-conn] Login error: ${username}@${server.name}: ${error.message}, Server info: `, server);
    }
    return connection;
  }

  async logoutAll(): Promise<void> {
    const logoutPromises = this.#connections.filter(
      (c) => c.auth).map(async (c) => {
      try {
        await c.api.logout();
        jellyfin.getLogger().info(`[jellyfin-conn] Logout successful: ${c.username}@${c.server.name}`);
      }
      catch (error: any) {
        jellyfin.getLogger().error(`[jellyfin-conn] Logout error: ${c.username}@${c.server.name}: ${error.message}, Server info: `, c.server);
      }
    });

    await Promise.all(logoutPromises);
    this.#connections = [];
  }

  async logout(connection: ServerConnection): Promise<void> {
    if (connection.auth) {
      try {
        await connection.api.logout();
        jellyfin.getLogger().info(`[jellyfin-conn] Logout successful: ${connection.username}@${connection.server.name}`);
      }
      catch (error: any) {
        jellyfin.getLogger().error(`[jellyfin-conn] Logout error: ${connection.username}@${connection.server.name}: ${error.message}, Server info: `, connection.server);
      }
    }
  }

  #getOrCreateConnection(server: Server, username: string): ServerConnection {
    const conn = this.findConnection(server, username);
    if (!conn) {
      if (!username) { // For legacy URIs without multi-user support
        const serverConfEntries = ServerHelper.getServersFromConfig();
        const serverConf = serverConfEntries.find((conf) => conf.url === server.url);
        if (serverConf) {
          username = serverConf.username;
        }
        else {
          throw Error('No server found in config');
        }
      }
      // We can't use the same device ID to login multiple users simultaneously 
      // On same Jellyfin server. Doing so will log out the previous users. So
      // We have to create new SDK instance with new device ID.
      const sdk = new JellyfinSdk({
        clientInfo: this.#sdkInitInfo.clientInfo,
        deviceInfo: {
          ...this.#sdkInitInfo.deviceInfo,
          id: uuidv4()
        }
      });

      const newConnection = {
        id: `${username}@${server.id}`,
        username,
        server,
        api: sdk.createApi(server.connectionUrl)
      };
      this.#connections.push(newConnection);
      return newConnection;
    }
    return conn;
  }

  findConnection(server: Server, username: string, authenticated = false): ServerConnection | null {
    return this.#connections.find(
      (c) => c.server.id === server.id && (authenticated ? c.auth?.User?.Name : c.username) === username) || null;
  }
}
