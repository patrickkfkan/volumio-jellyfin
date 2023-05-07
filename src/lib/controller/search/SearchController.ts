import ConnectionManager from '../../connection/ConnectionManager';
import Server from '../../entities/Server';
import { RenderedList } from '../browse/view-handlers/ViewHandler';
import jellyfin from '../../JellyfinContext';
import ViewHandlerFactory from '../browse/view-handlers/ViewHandlerFactory';
import ServerHelper from '../../util/ServerHelper';

export interface SearchQuery {
  value: string;
}

export default class SearchController {

  #connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.#connectionManager = connectionManager;
  }

  async search(query: SearchQuery): Promise<RenderedList[]> {
    if (!query) {
      return [];
    }
    const searchAlbums = jellyfin.getConfigValue('searchAlbums', true);
    const searchArtists = jellyfin.getConfigValue('searchArtists', true);
    const searchSongs = jellyfin.getConfigValue('searchSongs', true);

    if (!searchAlbums && !searchArtists && !searchSongs) {
      return [];
    }

    const serverConfEntries = ServerHelper.getServersFromConfig();
    const onlineServers = jellyfin.get<Server[]>('onlineServers', []);

    const searchUris: string[] = serverConfEntries.reduce<string[]>((uris, conf) => {
      const server = onlineServers.find((server) => server.url === conf.url);
      if (server) {
        const usernameAtServerStr = `${conf.username}@${server.id}`;
        if (searchAlbums) {
          uris.push(`jellyfin/${usernameAtServerStr}/albums@search=${encodeURIComponent(query.value)}@collatedSearchResults=1`);
        }
        if (searchArtists) {
          uris.push(`jellyfin/${usernameAtServerStr}/artists@search=${encodeURIComponent(query.value)}@collatedSearchResults=1`);
        }
        if (searchSongs) {
          uris.push(`jellyfin/${usernameAtServerStr}/songs@search=${encodeURIComponent(query.value)}@collatedSearchResults=1`);
        }
      }
      return uris;
    }, []);

    const searchResultListsPromises = searchUris.map((uri) => this.#getListsFromSearchUri(uri));
    const searchResultLists = (await Promise.all(searchResultListsPromises)).reduce((result, lists) => {
      lists.forEach((list) => {
        if (list.items.length > 0) {
          result.push(list);
        }
      });
      return result;
    }, []);

    return searchResultLists;
  }

  async #getListsFromSearchUri(uri: string): Promise<RenderedList[]> {
    try {
      const handler = await ViewHandlerFactory.getHandler(uri, this.#connectionManager);
      const searchResultsPage = await handler.browse();
      return searchResultsPage.navigation?.lists || [];
    }
    catch (error: any) {
      return [];
    }
  }
}
