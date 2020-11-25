'use strict';

const AlbumArtHandler = require(jellyfinPluginLibRoot + '/util/albumart');

class BaseParser {

    constructor(uri, curView, prevViews, apiClient) {
        this._uri = uri;
        this._curView = curView;
        this._prevViews = prevViews;
        this._apiClient = apiClient;
    }

    parseToListItem(item) {
        return null;
    }

    parseToHeader(item) {
        let baseUri = this.getUri();

        return {
            'uri': baseUri,
            'service': 'jellyfin',
            'type': 'song',
            'album': item.Name,
            'albumart': this.getAlbumArt(item)
        };
    }

    getUri() {
        return this._uri;
    }

    getCurrentView() {
        return this._curView;
    }

    getPreviousViews() {
        return this._prevViews;
    }

    getApiClient() {
        return this._apiClient;
    }

    getAlbumArt(item) {
        if (this._albumArtHandler == undefined) {
            this._albumArtHandler = new AlbumArtHandler(this.getApiClient());
        }
        return this._albumArtHandler.getAlbumArt(item);
    }
}

module.exports = BaseParser;