'use strict';

const UserViewModel = require(__dirname + '/userview');
const AlbumModel = require(__dirname + '/album');
const PlaylistModel = require(__dirname + '/playlist');
const ArtistModel = require(__dirname + '/artist');
const AlbumArtistModel = require(__dirname + '/album-artist');
const GenreModel = require(__dirname + '/genre');
const SongModel = require(__dirname + '/song');

let typeToClass = {
    userView: UserViewModel,
    album: AlbumModel,
    playlist: PlaylistModel,
    artist: ArtistModel,
    albumArtist: AlbumArtistModel,
    genre: GenreModel,
    song: SongModel
};

let getInstance = (type, apiClient) => {
    return new typeToClass[type](apiClient);
}

module.exports = {
    getInstance: getInstance
};