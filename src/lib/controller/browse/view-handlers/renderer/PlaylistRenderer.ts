import BaseRenderer, { RenderedHeader, RenderedListItem } from './BaseRenderer';
import Playlist from '../../../../entities/Playlist';
import jellyfin from '../../../../JellyfinContext';

export default class PlaylistRenderer extends BaseRenderer<Playlist> {

  renderToListItem(data: Playlist): RenderedListItem | null {
    return {
      service: 'jellyfin',
      type: 'folder',
      title: data.name,
      albumart: this.getAlbumArt(data),
      uri: `${this.uri}/songs@playlistId=${encodeURIComponent(data.id)}`
    };
  }

  renderToHeader(data: Playlist): RenderedHeader | null {
    const header = super.renderToHeader(data) || {} as RenderedHeader;
    header.artist = jellyfin.getI18n('JELLYFIN_PLAYLIST');
    return header;
  }
}
