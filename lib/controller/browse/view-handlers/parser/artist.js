'use strict';

const BaseParser = require(__dirname + '/base');

class ArtistParser extends BaseParser {

    parseToListItem(artist) {
        let baseUri = this.getUri();
        let parentId = this.getCurrentView().parentId;
        
        let data = {
            'service': 'jellyfin',
            'type': 'folder',
            'title': artist.Name,
            'albumart': this.getAlbumArt(artist),
            'uri': baseUri + '/albums@parentId=' + parentId + '@' + this._getArtistType() + 'Id=' + artist.Id
        }
        return data;
    }

    _getArtistType() {
        return 'artist';
    }
}

module.exports = ArtistParser;