'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const BaseViewHandler = require(__dirname + '/base');

class PlaylistViewHandler extends BaseViewHandler {

    browse() {
        let self = this;
        let defer = libQ.defer();

        let prevUri = self.constructPrevUri();
        let nextUri = self.constructNextUri();
        
        let view = self.getCurrentView();
        let startIndex = view.startIndex;
        
        let limit = jellyfin.getConfigValue('itemsPerPage', 47);

        let model = self.getModel('playlist');
        let parser = self.getParser('playlist');

        let options = {
            startIndex: startIndex,
            limit: limit
        };

        model.getPlaylists(options).then( (playlists) => {
            let items = [];
            playlists.items.forEach( (playlist) => {
                items.push(parser.parseToListItem(playlist));
            });
            if (playlists.startIndex + playlists.items.length < playlists.total) {
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

}

module.exports = PlaylistViewHandler;