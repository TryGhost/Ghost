'use strict';

var _ = require('lodash'),
    config  = require('../../config'),
    defaultPostOptions = {};

class Channel {
    constructor(name, options) {
        // Set the name
        this.name = name;

        // Store the originally passed in options
        this._origOptions = _.cloneDeep(options) || {};

        // Setup our route
        // @TODO should a channel have a route as part of the object? Or should this live elsewhere?
        this.route = this._origOptions.route ? this.translateRoute(this._origOptions.route) : '/';

        // Define context as name, plus any additional contexts, and don't allow duplicates
        this.context = _.union([this.name], this._origOptions.context);

        // DATA options
        // Options for fetching related posts
        this.postOptions = _.defaults({}, defaultPostOptions, this._origOptions.postOptions);

        // RESOURCE!!!
        // @TODO figure out a better way to declare relation to resource
        if (this._origOptions.data) {
            this.data = this._origOptions.data;
        }

        // Template options
        // @TODO fix these HORRIBLE names
        this.slugTemplate = !!this._origOptions.slugTemplate;
        if (this._origOptions.frontPageTemplate) {
            this.frontPageTemplate = this._origOptions.frontPageTemplate;
        }

        if (this._origOptions.editRedirect) {
            this.editRedirect = this._origOptions.editRedirect;
        }
    }

    get isPaged() {
        return _.has(this._origOptions, 'paged') ? this._origOptions.paged : true;
    }

    get hasRSS() {
        return _.has(this._origOptions, 'rss') ? this._origOptions.rss : true;
    }

    translateRoute(route) {
        // @TODO find this a more general / global home, as part of the Router system,
        // so that ALL routes that get registered WITH Ghost can do this
        return route.replace(/:t_([a-zA-Z]+)/, function (fullMatch, keyword) {
            return config.get('routeKeywords')[keyword];
        });
    }
}

module.exports = Channel;
