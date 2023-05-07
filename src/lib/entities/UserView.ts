import { EntityType } from '.';
import BaseEntity from './BaseEntity';

export enum UserViewType {
  Collections = 'Collections',
  Playlists = 'Playlists',
  Library = 'Library',
  Folders = 'Folder'
}

interface UserView extends BaseEntity {
  type: EntityType.UserView;
  userViewType?: UserViewType;
}

export default UserView;
