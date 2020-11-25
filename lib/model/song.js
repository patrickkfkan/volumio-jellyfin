'use strict';

const BaseModel = require(__dirname + '/base');

class SongModel extends BaseModel {

    getSongs(options = {}, tag = '') {

        let queryOptions = this.getBaseQueryOptions(options, 'Audio');

        if (options.includeMediaSources) {
            queryOptions.Fields = 'MediaSources';
        }

        if (options.isPlayed) {
            queryOptions.Filters = (queryOptions.Filters ? queryOptions.Filters + ',' : '') + 'IsPlayed';
        }
        
        return this.getItems(queryOptions, tag);
    }

    getSong(songId) {
        return this.getItem(songId);
    }
}

module.exports = SongModel;