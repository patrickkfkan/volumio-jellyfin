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

    setPageTitle(view, nav, options = {}) {
        let self = this;
        let defer = libQ.defer();

        let opts = Object.assign({
            showParentText: true
        }, options);

        let serverText = self.getApiClient().serverInfo().Name;

        let itemText;
        // If first list already has a title, use that. Otherwise, deduce from view.
        if (nav.lists[0].title != undefined) {
            itemText = nav.lists[0].title;
        }
        else if (view.fixedView != undefined) {
            let itemTextKey;
            switch(view.fixedView) {
                case 'latest':
                    itemTextKey = `LATEST_${view.name.toUpperCase()}`;
                    break;
                case 'recentlyPlayed':
                    itemTextKey = `RECENTLY_PLAYED_${view.name.toUpperCase()}`;
                    break;
                case 'frequentlyPlayed':
                    itemTextKey = `FREQUENTLY_PLAYED_${view.name.toUpperCase()}`;
                    break;
                case 'favorite':
                    itemTextKey = `FAVORITE_${view.name.toUpperCase()}`;
                    break;
                default:
                    itemTextKey = null;
            }
            itemText = itemTextKey ? jellyfin.getI18n(`JELLYFIN_${itemTextKey}`) : '';
        }
        else if (view.search != undefined) {
            let itemName = jellyfin.getI18n(`JELLYFIN_${view.name.toUpperCase()}`);
            itemText = itemName ? jellyfin.getI18n('JELLYFIN_ITEMS_MATCHING', itemName, view.search) : '';
        }
        else {
            itemText = jellyfin.getI18n(`JELLYFIN_${view.name.toUpperCase()}`);
        }

        let parentTextPromise;
        if (view.parentId && opts.showParentText) {
            let model = self.getModel('userView');
            parentTextPromise = model.getUserView(view.parentId).then( 
                userView => userView.Name
            )
            .fail( error => '' );
        }
        else {
            parentTextPromise = libQ.resolve('');
        }

        parentTextPromise.then( parentText => {
            if (itemText) {
                let title;
                if (parentText) {
                    title = jellyfin.getI18n('JELLYFIN_PAGE_TITLE', parentText, itemText);
                }
                else {
                    title = itemText;
                }

                nav.lists[0].title = `
                <div style="width: 100%;">
                    <div style="font-size: 14px; line-height: 18px; border-bottom: 1px dotted; border-color: #666; padding-bottom: 10px;">
                        <img src="/albumart?sourceicon=${ encodeURIComponent('music_service/jellyfin/assets/images/jellyfin.svg') }" style="width: 18px; height: 18px; margin-right: 8px;">${ serverText }
                    </div>
                    <div style="margin-top: 25px;">${ title }</div>
                </div>`;
            }
            defer.resolve(nav);
        });

        return defer.promise;
    }

}

module.exports = BaseViewHandler