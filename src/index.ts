// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import libQ from 'kew';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import vconf from 'v-conf';

import jellyfin from './lib/JellyfinContext';
import ServerPoller from './lib/connection/ServerPoller';
import { Jellyfin as JellyfinSdk } from '@jellyfin/sdk';
import pluginInfo from '../package.json';
import BrowseController from './lib/controller/browse';
import ConnectionManager, { JellyfinSdkInitInfo } from './lib/connection/ConnectionManager';
import SearchController, { SearchQuery } from './lib/controller/search/SearchController';
import PlayController from './lib/controller/play/PlayController';
import { ExplodedTrackInfo } from './lib/controller/browse/view-handlers/Explodable';
import { jsPromiseToKew } from './lib/util';
import ServerHelper from './lib/util/ServerHelper';

interface GotoParams extends ExplodedTrackInfo {
  type: 'album' | 'artist';
}

class ControllerJellyfin {
  #context: any;
  #config: any;
  #commandRouter: any;

  #serverPoller: ServerPoller | null;
  #connectionManager: ConnectionManager | null;
  #browseController: BrowseController | null;
  #searchController: SearchController | null;
  #playController: PlayController | null;

  constructor(context: any) {
    this.#context = context;
    this.#commandRouter = context.coreCommand;
  }

  getUIConfig() {
    const defer = libQ.defer();

    const lang_code = this.#commandRouter.sharedVars.get('language_code');

    const configPrepTasks = [
      this.#commandRouter.i18nJson(`${__dirname}/i18n/strings_${lang_code}.json`,
        `${__dirname}/i18n/strings_en.json`,
        `${__dirname}/UIConfig.json`)
    ];

    libQ.all(configPrepTasks).then((configParams: [any, string]) => {
      const [ uiconf ] = configParams;
      const removeServerUIConf = uiconf.sections[1];
      const browseSettingsUIConf = uiconf.sections[2];
      const playAddUIConf = uiconf.sections[3];
      const searchSettingsUIConf = uiconf.sections[4];
      const myMediaLibraryUIConf = uiconf.sections[5];

      // Remove Server section
      const servers = ServerHelper.getServersFromConfig();
      servers.forEach((server, index) => {
        removeServerUIConf.content[0].options.push({
          value: index,
          label: `${server.username}@${server.url}`
        });
      });
      if (servers.length > 0) {
        removeServerUIConf.content[0].value = removeServerUIConf.content[0].options[0];
      }

      // Browse Settings section
      const itemsPerPage = jellyfin.getConfigValue('itemsPerPage', 47);
      const showAllAlbumTracks = jellyfin.getConfigValue('showAllAlbumTracks', true);
      const showAllPlaylistTracks = jellyfin.getConfigValue('showAllPlaylistTracks', true);
      const rememberFilters = jellyfin.getConfigValue('rememberFilters', true);
      browseSettingsUIConf.content[0].value = itemsPerPage;
      browseSettingsUIConf.content[1].value = showAllAlbumTracks;
      browseSettingsUIConf.content[2].value = showAllPlaylistTracks;
      browseSettingsUIConf.content[3].value = rememberFilters;

      // Play / Add to Queue section
      const maxTracks = jellyfin.getConfigValue('maxTracks', 100);
      const noMaxTracksSingleAlbum = jellyfin.getConfigValue('noMaxTracksSingleAlbum', true);
      const noMaxTracksSinglePlaylist = jellyfin.getConfigValue('noMaxTracksSinglePlaylist', true);
      playAddUIConf.content[0].value = maxTracks;
      playAddUIConf.content[1].value = noMaxTracksSingleAlbum;
      playAddUIConf.content[2].value = noMaxTracksSinglePlaylist;

      // Search Settings section
      const searchAlbums = jellyfin.getConfigValue('searchAlbums', true);
      const searchAlbumsResultCount = jellyfin.getConfigValue('searchAlbumsResultCount', 11);
      const searchArtists = jellyfin.getConfigValue('searchArtists', true);
      const searchArtistsResultCount = jellyfin.getConfigValue('searchArtistsResultCount', 11);
      const searchSongs = jellyfin.getConfigValue('searchSongs', true);
      const searchSongsResultCount = jellyfin.getConfigValue('searchSongsResultCount', 11);
      searchSettingsUIConf.content[0].value = searchAlbums;
      searchSettingsUIConf.content[1].value = searchAlbumsResultCount;
      searchSettingsUIConf.content[2].value = searchArtists;
      searchSettingsUIConf.content[3].value = searchArtistsResultCount;
      searchSettingsUIConf.content[4].value = searchSongs;
      searchSettingsUIConf.content[5].value = searchSongsResultCount;

      // My Media / Library
      const showLatestMusicSection = jellyfin.getConfigValue('showLatestMusicSection', true);
      const latestMusicSectionItems = jellyfin.getConfigValue('latestMusicSectionItems', 11);
      const showRecentlyPlayedSection = jellyfin.getConfigValue('showRecentlyPlayedSection', true);
      const recentlyPlayedSectionItems = jellyfin.getConfigValue('recentlyPlayedSectionItems', 5);
      const showFrequentlyPlayedSection = jellyfin.getConfigValue('showFrequentlyPlayedSection', true);
      const frequentlyPlayedSectionItems = jellyfin.getConfigValue('frequentlyPlayedSectionItems', 5);
      const showFavoriteArtistsSection = jellyfin.getConfigValue('showFavoriteArtistsSection', true);
      const favoriteArtistsSectionItems = jellyfin.getConfigValue('favoriteArtistsSectionItems', 5);
      const showFavoriteAlbumsSection = jellyfin.getConfigValue('showFavoriteAlbumsSection', true);
      const favoriteAlbumsSectionItems = jellyfin.getConfigValue('favoriteAlbumsSectionItems', 5);
      const showFavoriteSongsSection = jellyfin.getConfigValue('showFavoriteSongsSection', true);
      const favoriteSongsSectionItems = jellyfin.getConfigValue('favoriteSongsSectionItems', 5);
      const collectionInSectionItems = jellyfin.getConfigValue('collectionInSectionItems', 11);
      myMediaLibraryUIConf.content[0].value = showLatestMusicSection;
      myMediaLibraryUIConf.content[1].value = latestMusicSectionItems;
      myMediaLibraryUIConf.content[2].value = showRecentlyPlayedSection;
      myMediaLibraryUIConf.content[3].value = recentlyPlayedSectionItems;
      myMediaLibraryUIConf.content[4].value = showFrequentlyPlayedSection;
      myMediaLibraryUIConf.content[5].value = frequentlyPlayedSectionItems;
      myMediaLibraryUIConf.content[6].value = showFavoriteArtistsSection;
      myMediaLibraryUIConf.content[7].value = favoriteArtistsSectionItems;
      myMediaLibraryUIConf.content[8].value = showFavoriteAlbumsSection;
      myMediaLibraryUIConf.content[9].value = favoriteAlbumsSectionItems;
      myMediaLibraryUIConf.content[10].value = showFavoriteSongsSection;
      myMediaLibraryUIConf.content[11].value = favoriteSongsSectionItems;
      myMediaLibraryUIConf.content[12].value = collectionInSectionItems;

      defer.resolve(uiconf);
    })
      .fail((error: any) => {
        jellyfin.getLogger().error(`[jellyfin] getUIConfig(): Cannot populate Jellyfin configuration - ${error}`);
        defer.reject(new Error());
      });

    return defer.promise;
  }

  refreshUIConfig() {
    this.#commandRouter.getUIConfigOnPlugin('music_service', 'jellyfin', {}).then((config: any) => {
      this.#commandRouter.broadcastMessage('pushUiConfig', config);
    });
  }

  configAddServer(data: any) {
    const host = data['host']?.trim() || '';
    if (host === '') {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_SPECIFY_HOST'));
      return;
    }

    let url;
    try {
      url = (new URL(host)).toString();
    }
    catch (error) {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_INVALID_HOST'));
      return;
    }

    const username = data['username'] || '';
    const password = data['password'] || '';

    const servers = ServerHelper.getServersFromConfig();
    servers.push({
      url,
      username: username,
      password: password
    });
    jellyfin.setConfigValue('servers', servers, true);
    jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_SERVER_ADDED'));

    this.#serverPoller?.addTarget(host);
    this.refreshUIConfig();
  }

  async configRemoveServer(data: any) {
    const index = data['server_entry'].value;
    if (index !== '') {
      const servers = ServerHelper.getServersFromConfig();
      const removed = servers.splice(index, 1)[0];
      jellyfin.setConfigValue('servers', servers, true);
      jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_SERVER_REMOVED'));

      const removedServer = this.#serverPoller?.findOnlineServer(removed.url);
      if (removedServer) {
        const connection = this.#connectionManager?.findConnection(removedServer, removed.username, true);
        if (connection) {
          await this.#connectionManager?.logout(connection);
        }

        const hasOtherServerWithSameUrl = !!servers.find((server) =>
          removedServer.connectionUrl === ServerHelper.getConnectionUrl(server.url));

        if (!hasOtherServerWithSameUrl) {
          this.#serverPoller?.removeTarget(removedServer.url);
        }
      }

      this.refreshUIConfig();
    }
  }

  configSaveBrowseSettings(data: any) {
    const showKeys = [
      'showAllAlbumTracks',
      'showAllPlaylistTracks',
      'rememberFilters'
    ];
    showKeys.forEach((key) => {
      jellyfin.setConfigValue(key, data[key]);
    });

    const itemsPerPage = parseInt(data.itemsPerPage, 10);
    if (itemsPerPage) {
      jellyfin.setConfigValue('itemsPerPage', itemsPerPage);
      jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_SETTINGS_SAVED'));
    }
    else {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_SETTINGS_ERR_ITEMS_PER_PAGE'));
    }
  }

  configSavePlayAddSettings(data: any) {
    const noMaxTrackKeys = [
      'noMaxTracksSingleAlbum',
      'noMaxTracksSinglePlaylist'
    ];
    noMaxTrackKeys.forEach((key) => {
      jellyfin.setConfigValue(key, data[key]);
    });
    const maxTracks = parseInt(data.maxTracks, 10);
    if (maxTracks) {
      jellyfin.setConfigValue('maxTracks', maxTracks);
      jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_SETTINGS_SAVED'));
    }
    else {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_SETTINGS_ERR_MAX_TRACK'));
    }
  }

  configSaveSearchSettings(data: any) {
    const searchKeys = [
      'searchAlbums',
      'searchArtists',
      'searchSongs'
    ];
    searchKeys.forEach((key) => {
      jellyfin.setConfigValue(key, data[key]);
    });

    const resultCountKeys = [
      'searchAlbumsResultCount',
      'searchArtistsResultCount',
      'searchSongsResultCount'
    ];
    let hasInvalidResultCountValue = false;
    resultCountKeys.forEach((key) => {
      const value = parseInt(data[key], 10);
      if (value) {
        jellyfin.setConfigValue(key, value);
      }
      else {
        hasInvalidResultCountValue = true;
      }
    });

    if (hasInvalidResultCountValue) {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_SETTINGS_ERR_RESULT_COUNT'));
    }
    else {
      jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_SETTINGS_SAVED'));
    }
  }

  configSaveMyMediaLibrarySettings(data: any) {
    const showKeys = [
      'showLatestMusicSection',
      'showRecentlyPlayedSection',
      'showFrequentlyPlayedSection',
      'showFavoriteArtistsSection',
      'showFavoriteAlbumsSection',
      'showFavoriteSongsSection'
    ];
    showKeys.forEach((key) => {
      jellyfin.setConfigValue(key, data[key]);
    });

    const itemsKeys = [
      'latestMusicSectionItems',
      'recentlyPlayedSectionItems',
      'frequentlyPlayedSectionItems',
      'favoriteArtistsSectionItems',
      'favoriteAlbumsSectionItems',
      'favoriteSongsSectionItems',
      'collectionInSectionItems'
    ];
    let hasInvalidItemsValue = false;
    itemsKeys.forEach((key) => {
      const value = parseInt(data[key], 10);
      if (value) {
        jellyfin.setConfigValue(key, value);
      }
      else {
        hasInvalidItemsValue = true;
      }
    });

    if (hasInvalidItemsValue) {
      jellyfin.toast('error', jellyfin.getI18n('JELLYFIN_SETTINGS_ERR_NUM_ITEMS'));
    }
    else {
      jellyfin.toast('success', jellyfin.getI18n('JELLYFIN_SETTINGS_SAVED'));
    }
  }

  onVolumioStart() {
    const configFile = this.#commandRouter.pluginManager.getConfigurationFile(this.#context, 'config.json');
    this.#config = new vconf();
    this.#config.loadFile(configFile);
    return libQ.resolve();
  }

  onStart() {
    jellyfin.init(this.#context, this.#config);

    // Initialize Jellyfin SDK
    const deviceInfo = jellyfin.getDeviceInfo();
    const sdkInitInfo: JellyfinSdkInitInfo = {
      clientInfo: {
        name: pluginInfo.name,
        version: pluginInfo.version
      },
      deviceInfo: {
        name: deviceInfo.name,
        id: deviceInfo.id
      }
    };
    const sdk = new JellyfinSdk(sdkInitInfo);

    this.#serverPoller = new ServerPoller(sdk);
    const pollListener = () => {
      jellyfin.set('onlineServers', this.#serverPoller?.getOnlineServers());
    };
    this.#serverPoller.on('serverOnline', pollListener.bind(this));
    this.#serverPoller.on('serverLost', pollListener.bind(this));
    const servers = ServerHelper.getServersFromConfig();
    this.#serverPoller.addTarget(servers.reduce<string[]>((urls, s) => {
      urls.push(s.url);
      return urls;
    }, []));

    this.#connectionManager = new ConnectionManager(sdkInitInfo);

    this.#browseController = new BrowseController(this.#connectionManager);
    this.#searchController = new SearchController(this.#connectionManager);
    this.#playController = new PlayController(this.#connectionManager);

    this.#addToBrowseSources();

    jellyfin.getLogger().info('[jellyfin] Initialized plugin with device info: ', deviceInfo);

    return libQ.resolve();
  }

  onStop() {
    const defer = libQ.defer();

    this.#serverPoller?.removeAllListeners();
    this.#serverPoller?.clearTargets();
    this.#serverPoller = null;

    this.#commandRouter.volumioRemoveToBrowseSources('Jellyfin');

    this.#browseController = null;
    this.#searchController = null;
    this.#playController?.dispose();
    this.#playController = null;

    if (this.#connectionManager) {
      this.#connectionManager?.logoutAll().then(() => {
        jellyfin.reset();
        defer.resolve();
      });
    }
    else {
      defer.resolve();
    }

    return defer.promise;
  }

  getConfigurationFiles() {
    return [ 'config.json' ];
  }

  #addToBrowseSources() {
    const data = {
      name: 'Jellyfin',
      uri: 'jellyfin',
      plugin_type: 'music_service',
      plugin_name: 'jellyfin',
      albumart: '/albumart?sourceicon=music_service/jellyfin/dist/assets/images/jellyfin-mono.png'
    };
    this.#commandRouter.volumioAddToBrowseSources(data);
  }

  handleBrowseUri(uri: string) {
    if (this.#browseController) {
      return jsPromiseToKew(this.#browseController.browseUri(uri));
    }
    return libQ.reject('Jellyfin plugin is not started');
  }

  explodeUri(uri: string) {
    if (this.#browseController) {
      return jsPromiseToKew(this.#browseController.explodeUri(uri));
    }
    return libQ.reject('Jellyfin plugin is not started');
  }

  clearAddPlayTrack(track: any) {
    return this.#playController?.clearAddPlayTrack(track);
  }

  stop() {
    return this.#playController?.stop();
  }

  pause() {
    return this.#playController?.pause();
  }

  resume() {
    return this.#playController?.resume();
  }

  seek(position: number) {
    return this.#playController?.seek(position);
  }

  next() {
    return this.#playController?.next();
  }

  previous() {
    return this.#playController?.previous();
  }

  search(query: SearchQuery) {
    if (this.#searchController) {
      return jsPromiseToKew(this.#searchController.search(query));
    }
    return libQ.reject('Jellyfin plugin is not started');
  }

  async goto(data: GotoParams): Promise<any> {
    if (!this.#playController || !this.#browseController) {
      throw Error('Jellyfin plugin is not started');
    }

    try {
      const { song, connection } = await this.#playController.getSongFromTrack(data);
      if (data.type === 'album') {
        if (song.album?.id) {
          return jsPromiseToKew(this.#browseController.browseUri(`jellyfin/${connection.id}/songs@albumId=${song.album.id}`));
        }
        throw Error('Song is missing album info');
      }
      else if (data.type === 'artist') {
        if (song.artists?.[0]?.id) {
          return jsPromiseToKew(this.#browseController.browseUri(`jellyfin/${connection.id}/albums@artistId=${song.artists[0].id}`));
        }
        throw Error('Song is missing artist info');
      }
      else {
        throw Error(`Invalid type '${data.type}'`);
      }
    }
    catch (error: any) {
      throw Error(`Failed to fetch requested info: ${error.message}`);
    }
  }
}

export = ControllerJellyfin;
