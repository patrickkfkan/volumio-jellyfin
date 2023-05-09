import { EntityType, Song } from '../../../entities';
import { ModelType } from '../../../model';
import FilterableViewHandler, { FilterableViewConfig } from './FilterableViewHandler';
import View from './View';
import { RenderedPage, RenderedPageContents } from './ViewHandler';
import { RenderedListItem } from './renderer/BaseRenderer';
export interface SongView extends View {
    name: 'songs' | 'song';
    parentId?: string;
    albumId?: string;
    playlistId?: string;
    songId?: string;
    search?: string;
    collatedSearchResults?: '1';
}
declare class SongViewHandler extends FilterableViewHandler<SongView> {
    browse(): Promise<RenderedPage>;
    getSongsOnExplode(): Promise<Song[]>;
    protected getFilterableViewConfig(): FilterableViewConfig;
}
declare const _default: {
    new (...args: any[]): {
        explode(): Promise<import("./Explodable").ExplodedTrackInfo[]>;
        _parseSongForExplode(song: Song): Promise<import("./Explodable").ExplodedTrackInfo | null>;
        _getAudioStreamMetadata(song: Song): import("./Explodable").AudioStreamMetadata | null;
        _getTrackUri(song: Song): string | null;
        "__#16@#uri": string;
        "__#16@#currentView": View;
        "__#16@#previousViews": View[];
        "__#16@#connection": import("../../../connection/ServerConnection").default | null;
        "__#16@#models": Record<any, import("../../../model/BaseModel").default>;
        "__#16@#renderers": Record<any, import("./renderer/BaseRenderer").default<import("../../../entities/BaseEntity").default> | null>;
        "__#16@#albumArtHandler": import("../../../util/AlbumArtHandler").default;
        browse(): Promise<RenderedPage>;
        readonly uri: string;
        readonly currentView: View;
        readonly previousViews: View[];
        getModel(type: ModelType.SortFilter): import("../../../model/filter/SortFilterModel").default;
        getModel(type: ModelType.FilterFilter): import("../../../model/filter/FilterFilterModel").default;
        getModel(type: ModelType.YearFilter): import("../../../model/filter/YearFilterModel").default;
        getModel(type: ModelType.GenreFilter): import("../../../model/filter/GenreFilterModel").default;
        getModel(type: ModelType.AZFilter): import("../../../model/filter/AZFilterModel").default;
        getModel(type: ModelType.Folder): import("../../../model/FolderModel").default;
        getModel(type: ModelType.Collection): import("../../../model/CollectionModel").default;
        getModel(type: ModelType.Song): import("../../../model/SongModel").default;
        getModel(type: ModelType.Genre): import("../../../model/GenreModel").default;
        getModel(type: ModelType.Artist): import("../../../model/ArtistModel").default;
        getModel(type: ModelType.Playlist): import("../../../model/PlaylistModel").default;
        getModel(type: ModelType.Album): import("../../../model/AlbumModel").default;
        getModel(type: ModelType.UserView): import("../../../model/UserViewModel").default;
        getRenderer(type: EntityType.Album): import("./renderer/AlbumRenderer").default;
        getRenderer(type: EntityType.Artist): import("./renderer/ArtistRenderer").default;
        getRenderer(type: EntityType.Collection): import("./renderer/CollectionRenderer").default;
        getRenderer(type: EntityType.Folder): import("./renderer/FolderRenderer").default;
        getRenderer(type: EntityType.Genre): import("./renderer/GenreRenderer").default;
        getRenderer(type: EntityType.Playlist): import("./renderer/PlaylistRenderer").default;
        getRenderer(type: EntityType.Server): import("./renderer/ServerRenderer").default;
        getRenderer(type: EntityType.Song): import("./renderer/SongRenderer").default;
        getRenderer(type: EntityType.UserView): import("./renderer/UserViewRenderer").default;
        constructPrevUri(): string;
        constructNextUri(startIndex?: number | undefined): string;
        constructNextPageItem(nextUri: string, title?: string | undefined): RenderedListItem;
        constructMoreItem(moreUri: string, title?: string | undefined): RenderedListItem;
        getModelQueryParams(bundle?: Record<string, any> | undefined): import("../../../model/BaseModel").GetItemsParams;
        getAlbumArt<T extends import("../../../entities/BaseEntity").default>(item: T): string;
        readonly serverConnection: import("../../../connection/ServerConnection").default | null;
        setPageTitle(pageContents: RenderedPageContents): Promise<RenderedPageContents>;
        getSongsOnExplode: () => Promise<Song[]>;
    };
} & typeof SongViewHandler;
export default _default;
//# sourceMappingURL=SongViewHandler.d.ts.map