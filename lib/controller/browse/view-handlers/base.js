'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const Model = require(jellyfinPluginLibRoot + '/model')
const Parser = require(__dirname + '/parser');
const AlbumArtHandler = require(jellyfinPluginLibRoot + '/util/albumart');

class BaseViewHandler {

    constructor(uri, curView, prevViews) {
        this._uri = uri;
        this._curView = curView;
        this._prevViews = prevViews;
        this._apiClient = null;
        this._models = {};
        this._parsers = {};
    }

    browse() {
        return libQ.resolve([]);
    }

    explode() {
        return libQ.reject("Operation not supported");
    }

    getUri() {
        return this._uri;
    }

    getCurrentView() {
        return this._curView;
    }

    getPreviousViews() {
        return this._prevViews;
    }

    setApiClient(apiClient) {
        this._apiClient = apiClient;
    }

    getApiClient() {
        return this._apiClient;
    }

    getModel(type) {
        if (this._models[type] == undefined) {
            this._models[type] = Model.getInstance(type, this.getApiClient());
        }
        return this._models[type];
    }

    getParser(type) {
        if (this._parsers[type] == undefined) {
            this._parsers[type] = Parser.getInstance(type, this.getUri(), this.getCurrentView(), this.getPreviousViews(), this.getApiClient());
        }
        return this._parsers[type];
    }

    getAlbumArt(item) {
        if (this._albumArtHandler == undefined) {
            this._albumArtHandler = new AlbumArtHandler(this.getApiClient());
        }
        return this._albumArtHandler.getAlbumArt(item);
    }

    constructPrevUri() {
        let curView = this.getCurrentView();
        let prevViews = this.getPreviousViews();
       
        let segments = [];
        
        prevViews.forEach( (view) => {
            segments.push(this._constructUriSegment(view));
        });
        
        if (curView.startIndex) {
            segments.push(this._constructUriSegment(curView, -jellyfin.getConfigValue('itemsPerPage', 47)));
        }

        return segments.join('/');
    }

    constructNextUri() {
        let curView = this.getCurrentView();
        let prevViews = this.getPreviousViews();
       
        let segments = [];
        
        prevViews.forEach( (view) => {
            segments.push(this._constructUriSegment(view));
        });

        segments.push(this._constructUriSegment(curView, jellyfin.getConfigValue('itemsPerPage', 47)));

        return segments.join('/');
    }

    _constructUriSegment(view, addToStartIndex = 0) {

        let segment;
        if (view.name === 'root') {
            segment = 'jellyfin';
        }
        else if (view.name === 'userViews') {
            segment = view.serverId;
        }
        else {
            segment = view.name;
        }

        Object.keys(view).filter( key => key !== 'name' && key !== 'startIndex' && key !== 'serverId' ).forEach( (key) => {
            segment += '@' + key + '=' + view[key];
        });

        let startIndex = 0;
        if (addToStartIndex) {
            startIndex = view.startIndex + addToStartIndex;
            if (startIndex < 0) {
                startIndex = 0;
            }
        }
        if (startIndex > 0) {
            segment += '@startIndex=' + startIndex;
        }

        return segment;
    }

    constructNextPageItem(nextUri, title = "<span style='color: #7a848e;'>" + jellyfin.getI18n('JELLYFIN_NEXT_PAGE') + "</span>") {
        let data = {
            service: 'jellyfin',
            type: 'streaming-category',
            'title': title,
            'uri': nextUri,
            'icon': 'fa fa-arrow-circle-right'
        }
        return data;
    }

    getModelOptions(bundle) {
        let defaults = {
            startIndex: 0,
            limit: jellyfin.getConfigValue('itemsPerPage', 47),
            sortBy: 'SortName',
            sortOrder: 'Ascending'
        };
        let props = Object.assign(defaults, bundle || this.getCurrentView());
        let options = this._assignIfExists(props, {}, [
            'startIndex',
            'limit',
            'sortBy',
            'sortOrder',
            'includeMediaSources',
            'parentId',
            'artistId',
            'albumArtistId',
            'genreId',
            'genreIds', // comma-delimited
            'search', // URI-encoded string
            'filters', // comma-delimited; e.g. 'IsFavorite, IsPlayed'
            // 'genres', // comma-delimited; each genre name is URI-encoded
            'years', // comma-delimited
            'nameStartsWith'
        ]);

        if (options.search != undefined) {
            options.search = decodeURIComponent(options.search);
        }

        return options;
    }

    _assignIfExists(from, to, props) {
        props.forEach( p => {
            if (from[p] != undefined) {
                to[p] = from[p];
            }
        });

        return to;
    }

    getFilterList(...types) {
        let self = this;
        let defer = libQ.defer();
        let baseUri = self.getUri();
        let view = this.getCurrentView();

        let promises = types.map( t => {
            let model = self.getModel(`filter.${t}`);
            return model.getFilter(view);
        });

        libQ.all(promises).then( filters => {
            let listItems = [];
            filters.forEach( filter => {
                let title;
                if (filter.subfilters) {
                    let subfilterTexts = filter.subfilters.map( f => self._getFilterListItemText(f) );
                    title = subfilterTexts.join(', ');
                }
                else {
                    title = self._getFilterListItemText(filter);
                }
                /*let selected = filter.options.filter( o => o.selected ) ;
                let title;
                if (selected.length > 0) {
                    title = selected.map( o => o.name ).join(', ');
                }
                else {
                    title = filter.placeholder;
                }*/


                listItems.push({
                    service: 'jellyfin',
                    type: 'jellyfinFilter',
                    title,
                    icon: filter.icon,
                    uri: baseUri + `/filter.${filter.type}`
                });
            });
            let list = [
                {
                    availableListViews: ['list'],
                    items: listItems
                }
            ]
            defer.resolve(list);
        });
        
        return defer.promise;
    }

    _getFilterListItemText(filter) {
        let selected = filter.options.filter( o => o.selected ) ;
        if (selected.length > 0) {
            return selected.map( o => o.name ).join(', ');
        }
        else {
            return filter.placeholder;
        }
    }

}

module.exports = BaseViewHandler