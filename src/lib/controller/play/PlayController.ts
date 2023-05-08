// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import libQ from 'kew';

import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import ConnectionManager from '../../connection/ConnectionManager';
import ServerConnection from '../../connection/ServerConnection';
import { Song } from '../../entities';
import Server from '../../entities/Server';
import jellyfin from '../../JellyfinContext';
import Model, { ModelType } from '../../model';
import { ExplodedTrackInfo } from '../browse/view-handlers/Explodable';
import ServerHelper from '../../util/ServerHelper';
import { kewToJSPromise } from '../../util';

interface PlaybackInfo {
  song: Song;
  connection: ServerConnection;
  streamUrl: string;
  lastStatus?: MpdState['status'];
}

interface MonitoredPlaybacks {
  current: Required<PlaybackInfo> & { lastReport?: ApiReportPlaybackParams['type'] } | null;
  pending: Omit<PlaybackInfo, 'lastStatus'> & { lastReport?: ApiReportPlaybackParams['type'] } | null;
}

interface MpdState {
  status: 'play' | 'stop' | 'pause';
  seek: number;
  uri: string;
}

interface ApiReportPlaybackParams {
  type: 'start' | 'stop' | 'pause' | 'unpause' | 'timeupdate';
  song: Song;
  connection: ServerConnection;
  seek: number;  // Milliseconds
}

export default class PlayController {

  #mpdPlugin: any;
  #connectionManager: ConnectionManager;
  #mpdPlayerStateListener: (() => void) | null;
  #monitoredPlaybacks: MonitoredPlaybacks;

  constructor(connectionManager: ConnectionManager) {
    this.#mpdPlugin = jellyfin.getMpdPlugin();
    this.#connectionManager = connectionManager;
    this.#mpdPlayerStateListener = null;
    this.#monitoredPlaybacks = { current: null, pending: null };
  }

  #addMpdPlayerStateListener() {
    if (this.#mpdPlayerStateListener) {
      return;
    }
    this.#mpdPlayerStateListener = this.#handleMpdPlayerEvent.bind(this);
    this.#mpdPlugin.clientMpd.on('system-player', this.#mpdPlayerStateListener);
  }

  #removeMpdPlayerStateListener() {
    if (!this.#mpdPlayerStateListener) {
      return;
    }
    this.#mpdPlugin.clientMpd.removeListener('system-player', this.#mpdPlayerStateListener);
    this.#mpdPlayerStateListener = null;
  }

  /**
   * Track uri:
   * jellyfin/{username}@{serverId}/song@songId={songId}
   */
  async clearAddPlayTrack(track: ExplodedTrackInfo): Promise<void> {
    jellyfin.getLogger().info(`[jellyfin-play] clearAddPlayTrack: ${track.uri}`);

    const {song, connection} = await this.getSongFromTrack(track);
    const streamUrl = this.#getStreamUrl(song, connection);
    this.#monitoredPlaybacks.pending = { song, connection, streamUrl };
    this.#addMpdPlayerStateListener();
    await this.#doPlay(streamUrl, track);
    await this.#markPlayed(song, connection);
    jellyfin.getStateMachine().trackType = track.trackType;
  }

  // Returns kew promise!
  stop() {
    jellyfin.getStateMachine().setConsumeUpdateService('mpd', true, false);
    return this.#mpdPlugin.stop();
  }

  // Returns kew promise!
  pause() {
    jellyfin.getStateMachine().setConsumeUpdateService('mpd', true, false);
    return this.#mpdPlugin.pause();
  }

  // Returns kew promise!
  resume() {
    jellyfin.getStateMachine().setConsumeUpdateService('mpd', true, false);
    return this.#mpdPlugin.resume();
  }

  // Returns kew promise!
  seek(position: number) {
    jellyfin.getStateMachine().setConsumeUpdateService('mpd', true, false);
    return this.#mpdPlugin.seek(position);
  }

  // Returns kew promise!
  next() {
    jellyfin.getStateMachine().setConsumeUpdateService('mpd', true, false);
    return this.#mpdPlugin.next();
  }

  // Returns kew promise!
  previous() {
    jellyfin.getStateMachine().setConsumeUpdateService(undefined);
    return jellyfin.getStateMachine().previous();
  }

  dispose() {
    this.#removeMpdPlayerStateListener();
    this.#monitoredPlaybacks = { current: null, pending: null };
  }

  /*Prefetch(trackBlock) {
      let uri = trackBlock.uri;
      let safeUri = uri.replace(/"/g, '\\"');
      let mpdPlugin = this.mpdPlugin;

      return mpdPlugin.sendMpdCommand('add "' + safeUri + '"', []).then( () => {
          return mpdPlugin.sendMpdCommand('consume 1', []);
      });
  };*/

  #getStreamUrl(song: Song, connection: ServerConnection): string {
    const source = song.mediaSources?.[0];
    const stream = source?.MediaStreams?.[0];
    if (!stream || !source) {
      throw Error(`No media streams found for song ${song.name}`);
    }

    const container = source.Container ? `.${source.Container}` : '';
    const path = `/Audio/${song.id}/stream${container}`;
    const pathUrlObj = new URL(path, connection.api.basePath);

    pathUrlObj.searchParams.set('static', 'true');
    if (source.Id) {
      pathUrlObj.searchParams.set('mediaSourceId', source.Id);
    }
    if (source.ETag) {
      pathUrlObj.searchParams.set('tag', source.ETag);
    }
    const streamUrl = pathUrlObj.toString();
    const safeUri = streamUrl.replace(/"/g, '\\"');

    jellyfin.getLogger().info(`[jellyfin-play] Stream URL for ${song.name}: ${safeUri}`);

    return safeUri;
  }

  // Returns kew promise!
  #doPlay(streamUrl: string, track: ExplodedTrackInfo) {
    const mpdPlugin = this.#mpdPlugin;

    return mpdPlugin.sendMpdCommand('stop', [])
      .then(() => {
        return mpdPlugin.sendMpdCommand('clear', []);
      })
      .then(() => {
        return mpdPlugin.sendMpdCommand(`load "${streamUrl}"`, []);
      })
      .fail(() => {
        // Send 'addid' command instead of 'add' to get mpd's Id of the song added.
        // We can then add tags using mpd's song Id.
        return mpdPlugin.sendMpdCommand(`addid "${streamUrl}"`, []);
      })
      .then((addIdResp: {Id: string}) => {
        // Set tags so that songs show the same title, album and artist as Jellyfin.
        // For songs that do not have metadata - either because it's not provided or the
        // Song format does not support it - mpd will return different info than Jellyfin if we do
        // Not set these tags beforehand. This also applies to DSFs - even though they support
        // Metadata, mpd will not read it because doing so incurs extra overhead and delay.
        if (addIdResp && typeof addIdResp.Id != undefined) {
          const songId = addIdResp.Id;

          const cmdAddTitleTag = {
            command: 'addtagid',
            parameters: [ songId, 'title', track.title ]
          };
          const cmdAddAlbumTag = {
            command: 'addtagid',
            parameters: [ songId, 'album', track.album ]
          };
          const cmdAddArtistTag = {
            command: 'addtagid',
            parameters: [ songId, 'artist', track.artist ]
          };

          return mpdPlugin.sendMpdCommandArray([ cmdAddTitleTag, cmdAddAlbumTag, cmdAddArtistTag ]);
        }

        return libQ.resolve();

      })
      .then(() => {
        jellyfin.getStateMachine().setConsumeUpdateService('mpd', true, false);
        return mpdPlugin.sendMpdCommand('play', []);
      });
  }

  async #markPlayed(song: Song, connection: ServerConnection): Promise<void> {
    const playstateApi = getPlaystateApi(connection.api);
    try {
      if (!connection.auth?.User?.Id) {
        throw Error('No auth');
      }
      await playstateApi.markPlayedItem({
        userId: connection.auth.User.Id,
        itemId: song.id,
        datePlayed: (new Date()).toUTCString()
      });
      jellyfin.getLogger().info(`[jellyfin-play]: Mark song ${song.name} as played by ${connection.auth.User.Name}.`);
    }
    catch (error: any) {
      jellyfin.getLogger().info(`[jellyfin-play]: Failed to mark song ${song.name} as played: ${error.message}`);
    }
  }

  async getSongFromTrack(track: ExplodedTrackInfo): Promise<{song: Song, connection: ServerConnection}> {
    const songIdPrefix = 'song@songId=';
    const uri = track.uri.split('/');
    const serverConnectionId = uri[1];
    let songId: string | null = null;
    if (uri[2].startsWith(songIdPrefix)) {
      songId = uri[2].substring(songIdPrefix.length).trim();
      if (songId === '') {
        songId = null;
      }
    }
    if (uri[0] !== 'jellyfin' || !serverConnectionId || !songId) {
      throw Error(`Invalid track uri: ${track.uri}`);
    }

    const [ username, serverId ] = serverConnectionId.split('@');
    const onlineServers = jellyfin.get<Server[]>('onlineServers', []);
    const targetServer = onlineServers.find((server) => server.id === serverId);

    if (!targetServer) {
      throw Error('Server unavailable');
    }

    const connection = await this.#connectionManager.getAuthenticatedConnection(
      targetServer, username, ServerHelper.fetchPasswordFromConfig.bind(ServerHelper));
    const model = Model.getInstance(ModelType.Song, connection);
    const song = await model.getSong(songId);

    if (!song) {
      throw Error(`Failed to obtain song from track uri: ${track.uri}`);
    }

    return {
      song,
      connection
    };
  }

  #millisecondsToTicks(seconds: number) {
    return seconds * 10000;
  }

  async #apiReportPlayback(params: ApiReportPlaybackParams): Promise<void> {
    const { type, song, connection, seek } = params;
    const positionTicks = this.#millisecondsToTicks(seek);
    try {
      if (!connection.auth?.User?.Id) {
        throw Error('No auth');
      }
      const playstateApi = getPlaystateApi(connection.api);
      if (type === 'start') {
        await playstateApi.reportPlaybackStart({
          playbackStartInfo: {
            ItemId: song.id,
            PositionTicks: positionTicks
          }
        });
      }
      else if (type === 'stop') {
        await playstateApi.reportPlaybackStopped({
          playbackStopInfo: {
            ItemId: song.id,
            PositionTicks: positionTicks
          }
        });
      }
      else if (type === 'pause') {
        await playstateApi.reportPlaybackProgress({
          playbackProgressInfo: {
            ItemId: song.id,
            IsPaused: true,
            PositionTicks: positionTicks
          }
        });
      }
      else if (type === 'unpause') {
        await playstateApi.reportPlaybackProgress({
          playbackProgressInfo: {
            ItemId: song.id,
            IsPaused: false,
            PositionTicks: positionTicks
          }
        });
      }
      else {  // type: timeupdate
        await playstateApi.reportPlaybackProgress({
          playbackProgressInfo: {
            ItemId: song.id,
            PositionTicks: positionTicks
          }
        });
      }
      jellyfin.getLogger().info(`[jellyfin-play]: Reported '${type}' for song: ${song.name}`)
    }
    catch (error: any) {
      jellyfin.getLogger().error(`[jellyfin-play]: Failed to report '${type}' for song '${song.name}': ${error.message}`);
    }
  }

  async #handleMpdPlayerEvent() {

    const __apiReportPlayback = (playbackInfo: Required<PlaybackInfo> & 
      { lastReport?: ApiReportPlaybackParams['type'] }, currentStatus: MpdState['status']) => {
        const reportPayload = {
          song: playbackInfo.song,
          connection: playbackInfo.connection,
          seek: mpdState.seek
        };
        const lastStatus = playbackInfo.lastStatus;
        playbackInfo.lastStatus = currentStatus;
        let reportType: ApiReportPlaybackParams['type'];
        switch (currentStatus) {
          case 'pause':
            reportType = 'pause';
            break;

          case 'play':
            if (lastStatus === 'pause') {
              reportType = 'unpause';
            }
            else if (lastStatus === 'play') {
              reportType = 'timeupdate';
            }
            else {  // lastStatus: stop
              reportType = 'start'
            }
            break;

          case 'stop':
          default:
            reportType = 'stop';
        }
        // Avoid multiple reports of same type
        if (playbackInfo.lastReport === reportType) {
          return;
        }
        playbackInfo.lastReport = reportType;
        return this.#apiReportPlayback({...reportPayload, type: reportType});
      };

    const mpdState: MpdState = await kewToJSPromise(this.#mpdPlugin.getState());
    // Current stream has not changed
    if (mpdState.uri === this.#monitoredPlaybacks.current?.streamUrl) {
      await __apiReportPlayback(this.#monitoredPlaybacks.current, mpdState.status);
    }
    // Stream previously fetched by the plugin and pending playback is now played
    else if (mpdState.uri === this.#monitoredPlaybacks.pending?.streamUrl) {
      const pending = this.#monitoredPlaybacks.pending;
      if (this.#monitoredPlaybacks.current && this.#monitoredPlaybacks.current.lastStatus !== 'stop') {
        await __apiReportPlayback(this.#monitoredPlaybacks.current, 'stop');
      }
      this.#monitoredPlaybacks.current = {
        ...pending,
        lastStatus: 'stop'
      };
      this.#monitoredPlaybacks.pending = null;
      await __apiReportPlayback(this.#monitoredPlaybacks.current, mpdState.status);
    }
    // Current stream has changed to one that was not loaded by the plugin
    else {
      if (this.#monitoredPlaybacks.current && this.#monitoredPlaybacks.current.lastStatus !== 'stop') {
        await __apiReportPlayback(this.#monitoredPlaybacks.current, 'stop');
      }
    }
  }
}