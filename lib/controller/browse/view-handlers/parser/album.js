'use strict';

const BaseParser = require(__dirname + '/base');

class AlbumParser extends BaseParser {

    parseToListItem(album) {
        let baseUri = this.getUri();
    
        let data = {
            'service': 'jellyfin',
            'type': 'folder',
            'title': album.Name,
            'artist': album.AlbumArtist,
            'albumart': this.getAlbumArt(album),
            'uri': baseUri + '/songs@albumId=' + album.Id
        }
        return data;
    }
}

module.exports = AlbumParser;