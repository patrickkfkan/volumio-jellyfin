'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin');
const BaseViewHandler = require(__dirname + '/../base');

class FilterViewHandler extends BaseViewHandler {

    browse() {
        let self = this;
        let defer = libQ.defer();

        let prevUri = self.constructPrevUri();
        let prevViews = self.getPreviousViews();
        let view = prevViews[prevViews.length - 1];
        let model = self.getModel(`filter.${self.getType()}`);

        model.getFilter(view).then( filter => {
            if (filter.subfilters) {
                let sublists = filter.subfilters.map( f => self._getFilterOptionsList(f) );
                let lists = [];
                sublists.forEach( list => {
                    lists = lists.concat(list);
                });
                return lists;
            }
            else {
                return self._getFilterOptionsList(filter);
            }
        })
        .then( lists => {
            let nav = {
                prev: {
                    uri: prevUri
                },
                lists
            };
    
            defer.resolve({
                navigation: nav
            });
        });

        return defer.promise;
    }

    // Override
    constructPrevUri() {
        let prevViews = this.getPreviousViews();
       
        let segments = [];
        
        prevViews.forEach( view => {
            segments.push(this._constructUriSegment(view));
        });

        return segments.join('/');
    }

    getBaseUri(field) {
        let prevViews = this.getPreviousViews();
        let lastView = Object.assign({}, prevViews[prevViews.length - 1]);

        delete lastView[field];
        delete lastView.startIndex;

        let segments = [];

        for (let i = 0; i < prevViews.length - 1; i++) {
            segments.push(this._constructUriSegment(prevViews[i]));
        }

        segments.push(this._constructUriSegment(lastView));

        return segments.join('/');
    }

    getType() {
        return '';
    }

    _getFilterOptionsList(filter) {
        let baseUri = this.getBaseUri(filter.field);
        let items = filter.options.map( option => ({
            service: 'jellyfin',
            type: 'jellyfinFilterOption',
            title: option.name,
            icon: option.selected ? 'fa fa-check' : 'fa',
            uri: baseUri + (option.value ? `@${filter.field}=` + option.value : '')
        }) );
        let lists = [];
        if (filter.resettable) {
            lists.push({
                availableListViews: ['list'],
                items: [
                    {
                        service: 'jellyfin',
                        type: 'jellyfinFilterOption',
                        title: jellyfin.getI18n('JELLYFIN_RESET'),
                        icon: 'fa fa-ban',
                        uri: baseUri
                    }
                ]
            });
        }    
        lists.push({
            availableListViews: ['list'],
            items
        });
        lists[0].title = filter.title;
        return lists;
    }

}

module.exports = FilterViewHandler;