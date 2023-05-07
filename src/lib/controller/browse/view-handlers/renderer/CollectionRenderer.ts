import Collection from '../../../../entities/Collection';
import BaseRenderer, { RenderedListItem } from './BaseRenderer';

export default class CollectionRenderer extends BaseRenderer<Collection> {

  renderToListItem(data: Collection): RenderedListItem | null {
    return {
      service: 'jellyfin',
      type: 'streaming-category',
      title: data.name,
      artist: String(data.year),
      albumart: this.getAlbumArt(data),
      uri: `${this.uri}/collection@parentId=${encodeURIComponent(data.id)}`
    };
  }
}
