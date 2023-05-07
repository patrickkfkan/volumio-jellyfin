import Genre from '../../../../entities/Genre';
import BaseRenderer, { RenderedHeader, RenderedListItem } from './BaseRenderer';
import jellyfin from '../../../../JellyfinContext';

export default class GenreRenderer extends BaseRenderer<Genre> {

  renderToListItem(data: Genre): RenderedListItem | null {
    return {
      'service': 'jellyfin',
      'type': 'folder',
      'title': data.name,
      'albumart': this.getAlbumArt(data),
      'uri': `${this.uri}/albums@parentId=${this.currentView.parentId}@genreId=${encodeURIComponent(data.id)}`
    };
  }

  renderToHeader(data: Genre): RenderedHeader | null {
    const header = super.renderToHeader(data) || {} as RenderedHeader;
    header.artist = jellyfin.getI18n('JELLYFIN_GENRE');
    return header;
  }
}
