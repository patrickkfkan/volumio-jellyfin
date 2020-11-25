'use strict';

const BaseParser = require(__dirname + '/base');

class PlaylistParser extends BaseParser {

    parseToListItem(playlist) {
        let baseUri = this.getUri();

        let data = {
            'service': 'jellyfin',
            'type': 'folder',
            'title': playlist.Name,
            'albumart': this.getAlbumArt(playlist),
            'uri': baseUri + '/songs@playlistId=' + playlist.Id
        }
        return data;
    }
}

module.exports = PlaylistParser;