'use strict';

const BaseParser = require(__dirname + '/base');

class GenreParser extends BaseParser {

    parseToListItem(genre) {
        let baseUri = this.getUri();
        let parentId = this.getCurrentView().parentId;
        
        let data = {
            'service': 'jellyfin',
            'type': 'folder',
            'title': genre.Name,
            'albumart': this.getAlbumArt(genre),
            'uri': baseUri + '/albums@parentId=' + parentId + '@genreId=' + genre.Id
        }
        return data;
    }
}

module.exports = GenreParser;