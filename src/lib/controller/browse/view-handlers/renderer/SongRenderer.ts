import BaseRenderer, { RenderedHeader, RenderedListItem } from './BaseRenderer';
import Song from '../../../../entities/Song';

export default class SongRenderer extends BaseRenderer<Song> {

  renderToListItem(data: Song): RenderedListItem | null {
    return {
      service: 'jellyfin',
      type: 'song',
      title: data.name,
      artist: this.getStringFromIdNamePair(data.artists),
      album: data.album?.name,
      duration: data.duration,
      uri: `${this.uri}/song@songId=${encodeURIComponent(data.id)}`,
      albumart: this.getAlbumArt(data)
    };
  }

  renderToHeader(): RenderedHeader | null {
    return null;
  }
}
