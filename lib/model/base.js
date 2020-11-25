'use strict';

const libQ = require('kew');

class BaseModel {

    constructor(apiClient) {
        this._apiClient = apiClient;
    }

    getApiClient() {
        return this._apiClient;
    }

    getItems(queryOptions, tag = '', apiMethod) {
        let defer = libQ.defer();
        let apiClient = this.getApiClient();

        if (apiMethod == undefined) {
            apiMethod = 'getItems';
        }
        apiClient[apiMethod](apiClient.getCurrentUserId(), queryOptions).then(
            (result) => {
                defer.resolve({
                    items: result.Items,
                    startIndex: result.StartIndex,
                    total: result.TotalRecordCount,
                    tag: tag
                });
            },
            (error) => {
                defer.reject(error);
            }
        );

        return defer.promise;
    }

    getItem(itemId) {
        let defer = libQ.defer();
        let apiClient = this.getApiClient();

        apiClient.getItem(apiClient.getCurrentUserId(), itemId).then(
            (item) => {
                defer.resolve(item);
            },
            (error) => {
                defer.reject(error);
            }
        );

        return defer.promise;
    }

    getBaseQueryOptions(options = {}, itemType) {
        let queryOptions = {
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            Recursive: true,
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary',
        };

        if (itemType != undefined) {
            queryOptions.IncludeItemTypes = itemType;
        }

        if (options.parentId != undefined) {
            queryOptions.ParentId = options.parentId;
        }

        if (options.startIndex != undefined) {
            queryOptions.StartIndex = options.startIndex;
        }
        if (options.limit != undefined) {
            queryOptions.Limit = options.limit;
        }

        if (options.sortBy != undefined) {
            queryOptions.SortBy = options.sortBy;
        }
        if (options.sortOrder != undefined) {
            queryOptions.SortOrder = options.sortOrder;
        }

        if (options.artistId != undefined) {
            queryOptions.ArtistIds = options.artistId;
        }
        if (options.albumArtistId != undefined) {
            queryOptions.AlbumArtistIds = options.albumArtistId;
        }
        if (options.genreId != undefined) {
            queryOptions.GenreIds = options.genreId;
        }

        if (options.isFavorite) {
            queryOptions.Filters = 'IsFavorite';
        }

        if (options.search) {
            queryOptions.SearchTerm = decodeURIComponent(options.search);
        }

        return queryOptions;
    }
}

module.exports = BaseModel;