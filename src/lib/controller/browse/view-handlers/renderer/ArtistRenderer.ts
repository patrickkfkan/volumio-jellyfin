import Artist from '../../../../entities/Artist';
import BaseRenderer, { RenderedHeader, RenderedListItem } from './BaseRenderer';
import jellyfin from '../../../../JellyfinContext';
import { EntityType } from '../../../../entities';

export default class ArtistRenderer extends BaseRenderer<Artist> {

  renderToListItem(data: Artist, options?: { noParent: boolean }): RenderedListItem | null {
    const key = data.type === EntityType.Artist ? 'artistId' : 'albumArtistId';
    const parentId = options?.noParent ? null : this.currentView.parentId;

    return {
      service: 'jellyfin',
      type: 'folder',
      title: data.name,
      albumart: this.getAlbumArt(data),
      uri: `${this.uri}/albums${parentId ? `@parentId=${parentId}` : ''}@${key}=${encodeURIComponent(data.id)}`
    };
  }

  renderToHeader(data: Artist): RenderedHeader | null {
    const header = super.renderToHeader(data) || {} as RenderedHeader;
    header.artist = jellyfin.getI18n('JELLYFIN_ARTIST');
    header.year = this.getStringFromIdNamePair(data.genres);
    return header;
  }
}
