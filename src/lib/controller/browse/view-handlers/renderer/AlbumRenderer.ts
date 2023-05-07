import Album from '../../../../entities/Album';
import BaseRenderer, { RenderedHeader, RenderedListItem } from './BaseRenderer';

export default class AlbumRenderer extends BaseRenderer<Album> {

  renderToListItem(data: Album): RenderedListItem | null {
    return {
      service: 'jellyfin',
      type: 'folder',
      title: data.name,
      artist: data.artist,
      duration: data.duration,
      albumart: this.getAlbumArt(data),
      uri: `${this.uri}/songs@albumId=${encodeURIComponent(data.id)}`
    };
  }

  renderToHeader(data: Album): RenderedHeader | null {
    const header = super.renderToHeader(data) || {} as RenderedHeader;
    header.artist = data.artist;
    header.year = data.year;
    // Duration does not get converted into time format when shown in header
    // (as opposed to list item). So we have to do it ourselves.
    header.duration = this.timeFormat(data.duration);
    header.genre = this.getStringFromIdNamePair(data.genres);

    return header;
  }
}
