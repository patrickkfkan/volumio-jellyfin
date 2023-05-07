import UserView, { UserViewType } from '../../../../entities/UserView';
import BaseRenderer, { RenderedListItem } from './BaseRenderer';

export default class UserViewRenderer extends BaseRenderer<UserView> {

  renderToListItem(data: UserView): RenderedListItem | null {
    let uri = this.uri;
    let type: RenderedListItem['type'];

    switch (data.userViewType) {
      case UserViewType.Collections:
        uri += `/collections@parentId=${encodeURIComponent(data.id)}`;
        type = 'streaming-category';
        break;

      case UserViewType.Playlists:
        uri += '/playlists';
        type = 'streaming-category';
        break;

      case UserViewType.Library:
        uri += `/library@parentId=${encodeURIComponent(data.id)}`;
        type = 'folder';
        break;

      case UserViewType.Folders:
        uri += `/folder@parentId=${encodeURIComponent(data.id)}`;
        type = 'streaming-category';
        break;

      default:
        return null;
    }

    return {
      service: 'jellyfin',
      type,
      title: data.name,
      uri: uri,
      albumart: this.getAlbumArt(data)
    };
  }
}
