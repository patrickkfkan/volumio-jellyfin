'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const ExplodableViewHandler = require(__dirname + '/explodable');

class SongViewHandler extends ExplodableViewHandler {

    browse() {
        let self = this;
        let defer = libQ.defer();

        let model = self.getModel('song');
        let parser = self.getParser('song');

        let prevUri = self.constructPrevUri();
        
        let view = self.getCurrentView();
        let albumId = view.albumId;
        let playlistId = view.playlistId;
        let parentId = view.parentId;
        let viewType = view.viewType;
      
        let isAlbum = (albumId != undefined);
        let isPlaylist = (playlistId != undefined);
        let pagination = false;
        let listViewOnly = (isAlbum || isPlaylist);

        let options = {};

        if (isAlbum) {
            options.parentId = albumId;

            if (!jellyfin.getConfigValue('showAllAlbumTracks', true)) {
                options.startIndex = view.startIndex;
                options.limit = jellyfin.getConfigValue('itemsPerPage', 47);
                pagination = true;
            }
        }
        else if (isPlaylist) {
            options.parentId = playlistId;

            if (!jellyfin.getConfigValue('showAllPlaylistTracks', true)) {
                options.startIndex = view.startIndex;
                options.limit = jellyfin.getConfigValue('itemsPerPage', 47);
                pagination = true;
            }
        }
        else {
            options.startIndex = view.startIndex;
            options.limit = jellyfin.getConfigValue('itemsPerPage', 47);
            pagination = true;

            if (parentId != undefined) {
                options.parentId = parentId;
            }
        }

        if (viewType === 'recentlyPlayed') {
            options.sortBy = 'DatePlayed,SortName';
            options.sortOrder = 'Descending,Ascending';
            options.isPlayed = true;
        }
        else if (viewType === 'frequentlyPlayed') {
            options.sortBy = 'PlayCount,SortName';
            options.sortOrder = 'Descending,Ascending';
            options.isPlayed = true;
        }
        else if (viewType === 'favorite') {
            options.isFavorite = true;
        }

        if (view.search != undefined) {
            options.search = view.search;
        }

        model.getSongs(options).then( (songs) => {
            let items = [];
            songs.items.forEach( (song) => {
                items.push(parser.parseToListItem(song));
            });
            if (pagination && (songs.startIndex + songs.items.length) < songs.total) {
                items.push(self.constructNextPageItem(self.constructNextUri()));
            }

            return {
                prev: {
                    uri: prevUri
                },
                lists: [
                    {
                        availableListViews: listViewOnly ? ['list'] : ['list', 'grid'],
                        items: items
                    }
                ]
            };
        }).then( (nav) => {
            let header, headerParser;
            if (isAlbum) {
                let albumModel = self.getModel('album');
                header = albumModel.getAlbum(albumId);
                headerParser = self.getParser('album');
            }
            else if (isPlaylist) {
                let playlistModel = self.getModel('playlist');
                header = playlistModel.getPlaylist(playlistId);
                headerParser = self.getParser('playlist');
            }

            if (header) {
                let headerDefer = libQ.defer();

                header.then( (parentInfo) => {
                    nav.info = headerParser.parseToHeader(parentInfo);
                    if (parentInfo.AlbumArtist != undefined) {
                        nav.info.artist = parentInfo.AlbumArtist;
                    }
                }).fin( () => {
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

        let view = self.getCurrentView();
        let model = self.getModel('song');

        if (view.name === 'song') {           
            return model.getSong(view.songId);
        }
        else if (view.name === 'songs') {
            let defer = libQ.defer();

            let options = {
                includeMediaSources: true,
            };

            if (view.albumId != undefined) {
                options.parentId = view.albumId;

                if (!jellyfin.getConfigValue('noMaxTracksSingleAlbum', true)) {
                    options.limit = jellyfin.getConfigValue('maxTracks', 100);
                }
            }
            else if (view.playlistId != undefined) {
                options.parentId = view.playlistId;

                if (!jellyfin.getConfigValue('noMaxTracksSinglePlaylist', true)) {
                    options.limit = jellyfin.getConfigValue('maxTracks', 100);
                }
            }
            else {
                options.limit = jellyfin.getConfigValue('maxTracks', 100);

                if (view.parentId != undefined) {
                    options.parentId = view.parentId;
                }
            }

            model.getSongs(options).then( (result) => {
                defer.resolve(result.items);
            }).fail( (error) => {
                defer.reject(error);
            });

            return defer.promise;
        }
        else {
            // Should never reach here, but just in case...
            return libQ.reject('View name is ' + view.name + ' but handler is for song');
        }
    }

}

module.exports = SongViewHandler;