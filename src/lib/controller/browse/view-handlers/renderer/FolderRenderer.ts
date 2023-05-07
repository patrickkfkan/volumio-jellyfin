import BaseRenderer, { RenderedListItem } from './BaseRenderer';
import Folder, { FolderType } from '../../../../entities/Folder';
import { EntityType } from '../../../../entities';

export default class FolderRenderer extends BaseRenderer<Folder> {

  renderToListItem(data: Folder): RenderedListItem | null {
    let title;
    if (data.type === EntityType.Folder) {
      title = `
        <div style='display: inline-flex; align-items: center;'>
            <i class='fa fa-folder-o' style='font-size: 20px; margin: -3px 8px 0 1px;'></i> <span>${data.name}</span>
        </div>
      `;
    }
    else {
      title = data.name;
    }

    const targetView = data.folderType === FolderType.Collections ? 'collections' : 'folder';

    return {
      service: 'jellyfin',
      type: 'streaming-category',
      title,
      uri: `${this.uri}/${targetView}@parentId=${encodeURIComponent(data.id)}`,
      albumart: this.getAlbumArt(data)
    };
  }
}
