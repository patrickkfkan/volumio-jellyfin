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
        let parentId = view.parentId;
        let startIndex = view.startIndex;
        let viewType = view.viewType;
        
        let limit = jellyfin.getConfigValue('itemsPerPage', 47);

        let model = self.getModel('album');
        let parser = self.getParser('album');

        let options = {
            parentId: parentId,
            startIndex: startIndex,
            limit: limit
        };

        if (view.artistId != undefined) {
            options.artistId = view.artistId;
        }
        else if (view.albumArtistId != undefined) {
            options.albumArtistId = view.albumArtistId;
        }
        else if (view.genreId != undefined) {
            options.genreId = view.genreId;
        }

        if (viewType === 'latest') {
            options.sortBy = 'DateCreated,SortName';
            options.sortOrder = 'Descending,Ascending';
        }
        else if (viewType === 'favorite') {
            options.isFavorite = true;
        }

        if (view.search != undefined) {
            options.search = view.search;
        }

        model.getAlbums(options).then( (albums) => {
            let items = [];
            albums.items.forEach( (album) => {
                items.push(parser.parseToListItem(album));
            });
            if (albums.startIndex + albums.items.length < albums.total) {
                items.push(self.constructNextPageItem(nextUri));
            }
            return {
                prev: {
                    uri: prevUri
                },
                lists: [
                    {
                        availableListViews: ['list', 'grid'],
                        items: items
                    }
                ]
            };
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
        let parentId = view.parentId;

        let model = self.getModel('song');

        let options = {
            includeMediaSources: true,
            limit: jellyfin.getConfigValue('maxTracks', 100)
        };

        if (parentId != undefined) {
            options.parentId = parentId;
        }

        if (view.artistId != undefined) {
            options.artistId = view.artistId;
        }
        else if (view.albumArtistId != undefined) {
            options.albumArtistId = view.albumArtistId;
        }
        else if (view.genreId != undefined) {
            options.genreId = view.genreId;
        }

        model.getSongs(options).then( (result) => {
            defer.resolve(result.items);
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

}

module.exports = AlbumViewHandler;