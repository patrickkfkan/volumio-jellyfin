'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const ExplodableViewHandler = require(__dirname + '/explodable');

class AlbumViewHandler extends ExplodableViewHandler {

    browse() {
        let self = this;
        let defer = libQ.defer();

        let prevUri = self.constructPrevUri();
        let nextUri = self.constructNextUri();
        
        let view = self.getCurrentView();
        let model = self.getModel('album');
        let parser = self.getParser('album');
        let options = self.getModelOptions();

        let showFilters = view.fixedView == undefined && view.search == undefined && 
            view.artistId == undefined && view.albumArtistId == undefined;

        let filterListPromise;
        if (!showFilters) {
            filterListPromise = libQ.resolve([]);
        }
        else if (view.genreId) { // coming from Genres view
            filterListPromise = self.getFilterList('sort', 'az', 'filter', 'year');
        }
        else {
            filterListPromise = self.getFilterList('sort', 'az', 'filter', 'genre', 'year');
        }

        filterListPromise.then( lists => {
            return model.getAlbums(options).then( (albums) => {
                let items = [];
                albums.items.forEach( (album) => {
                    items.push(parser.parseToListItem(album));
                });
                if (albums.startIndex + albums.items.length < albums.total) {
                    items.push(self.constructNextPageItem(nextUri));
                }
                lists.push({
                    availableListViews: ['list', 'grid'],
                    items: items
                });
                return {
                    prev: {
                        uri: prevUri
                    },
                    lists
                };
            });
        }).then ( (nav) => {
            let header, headerParser;
            if (view.artistId != undefined) {
                let artistModel = self.getModel('artist');
                header = artistModel.getArtist(view.artistId);
                headerParser = self.getParser('artist');
            }
            else if (view.albumArtistId != undefined) {
                let albumArtistModel = self.getModel('albumArtist');
                header = albumArtistModel.getAlbumArtist(view.albumArtistId);
                headerParser = self.getParser('albumArtist');
            }
            else if (view.genreId != undefined) {
                let genreModel = self.getModel('genre');
                header = genreModel.getGenre(view.genreId);
                headerParser = self.getParser('genre');
            }

            if (header) {
                let headerDefer = libQ.defer();

                header.then( (headerItem) => {
                    nav.info = headerParser.parseToHeader(headerItem)
                })
                .fin( () => {
                    headerDefer.resolve(nav);
                });

                return headerDefer.promise;
            }
            else {
                return nav;
            }
        }).then( (nav) => {
            defer.resolve({
                navigation: nav
            });
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    getSongsOnExplode() {
        let self = this;
        let defer = libQ.defer();

        let view = self.getCurrentView();
        let model = self.getModel('song');
        let options = self.getModelOptions(Object.assign({}, view, {
            includeMediaSources: true,
            limit: jellyfin.getConfigValue('maxTracks', 100)
        }));

        model.getSongs(options).then( (result) => {
            defer.resolve(result.items);
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

}

module.exports = AlbumViewHandler;