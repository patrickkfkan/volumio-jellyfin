import Server from '../../../../entities/Server';
import BaseRenderer, { RenderedHeader, RenderedListItem } from './BaseRenderer';

export default class ServerRenderer extends BaseRenderer<Server & { username: string }> {

  renderToListItem(data: Server & { username: string }): RenderedListItem | null {
    return {
      'service': 'jellyfin',
      'type': 'streaming-category',
      'title': `${data.username} @ ${data.name}`,
      'uri': `jellyfin/${data.username}@${data.id}`,
      'albumart': '/albumart?sourceicon=music_service/jellyfin/dist/assets/images/jellyfin.png'
    };
  }

  renderToHeader(): RenderedHeader | null {
    return null;
  }
}
