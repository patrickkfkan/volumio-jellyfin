'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const BaseViewHandler = require(__dirname + '/base');

class GenreViewHandler extends BaseViewHandler {

    browse() {
        let self = this;
        let defer = libQ.defer();

        let prevUri = self.constructPrevUri();
        let nextUri = self.constructNextUri();
        
        let model = self.getModel('genre');
        let parser = self.getParser('genre');
        let options = self.getModelOptions();

        model.getGenres(options).then( (genres) => {
            let items = [];
            genres.items.forEach( (genre) => {
                items.push(parser.parseToListItem(genre));
            });
            if (genres.startIndex + genres.items.length < genres.total) {
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

module.exports = GenreViewHandler;