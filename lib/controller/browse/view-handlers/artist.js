'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const BaseViewHandler = require(__dirname + '/base');

class ArtistViewHandler extends BaseViewHandler {

    browse() {
        let self = this;
        let defer = libQ.defer();

        let prevUri = self.constructPrevUri();
        let nextUri = self.constructNextUri();
        
        let view = self.getCurrentView();
        let parentId = view.parentId;
        let startIndex = view.startIndex;
        let viewType = view.viewType;
        
        let limit = jellyfin.getConfigValue('itemsPerPage', 47);

        let parser = self.getParser('artist');

        let options = {
            parentId: parentId,
            startIndex: startIndex,
            limit: limit
        };

        if (viewType === 'favorite') {
            options.isFavorite = true;
        }

        if (view.search != undefined) {
            options.search = view.search;
        }

        self._getArtists(options).then( (result) => {
            let items = [];
            result.items.forEach( (artist) => {
                items.push(parser.parseToListItem(artist));
            });
            if (startIndex + result.items.length < result.total) { // don't use result.StartIndex (always returns 0)
                items.push(self.constructNextPageItem(nextUri));
            }
            defer.resolve({
                navigation: {
                    prev: {
                        uri: prevUri
                    },
                    lists: [
                        {
                            availableListViews: ['list', 'grid'],
                            items: items
                        }
                    ]
                }
            });
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    _getArtists(options) {
        let model = this.getModel('artist');
        return model.getArtists(options);
    }

    _getArtistType() {
        return 'artist';
    }

}

module.exports = ArtistViewHandler;