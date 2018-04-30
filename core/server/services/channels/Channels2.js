/* eslint-disable */

const _ = require('lodash');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const common = require('../../lib/common');
const settingsCache = require('../settings/cache');

/**
 * @temporary
 *
 * This is not designed yet. This is all temporary.
 */
class RoutingType extends EventEmitter {
    constructor(obj) {
        super();

        this.route = _.defaults(obj.route, {value: null, extensions: {}});
        this.config = obj.config;
    }

    getRoute() {
        return this.route;
    }

    getPermalinks() {
        return false;
    }

    getType() {
        return this.config.type;
    }

    getFilter() {
        return this.config.options && this.config.options.filter;
    }

    toString() {
        return `Type: ${this.getType()}, Route: ${this.getRoute().value}`;
    }
}

class Collection extends RoutingType {
    constructor(obj) {
        super(obj);

        this.permalinks = _.defaults(obj.permalinks, {value: null, extensions: {}});

        this.permalinks.getValue = () => {
            /**
             * @deprecated Remove in Ghost 2.0
             */
            if (this.permalinks.value.match(/settings\.permalinks/)) {
                const value = this.permalinks.value.replace(/\/{settings\.permalinks}\//, settingsCache.get('permalinks'));
                return path.join(this.route.value, value);
            }

            return path.join(this.route.value, this.permalinks.value);
        };

        this._listeners();
        common.events.emit('routingType.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }

    _listeners() {
        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.getPermalinks() && this.getPermalinks().value.match(/settings\.permalinks/)) {
            common.events.on('settings.permalinks.edited', () => {
                this.emit('updated');
            });
        }
    }

    toString() {
        return `Type: ${this.getType()}, Route: ${this.getRoute().value}, Permalinks: ${this.getPermalinks().value}`;
    }
}

class Taxonomy extends RoutingType {
    constructor(obj) {
        super(obj);

        this.permalinks = {value: '/:slug/', extensions: {}};

        this.permalinks.getValue = () => {
            return path.join(this.route.value, this.permalinks.value);
        };

        common.events.emit('routingType.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }

    toString() {
        return `Type: ${this.getType()}, Route: ${this.getRoute().value}, Permalinks: ${this.getPermalinks().value}`;
    }
}

class StaticPages extends RoutingType {
    constructor(obj) {
        super(obj);

        this.permalinks = {value: '/:slug/', extensions: {}};

        this.permalinks.getValue = () => {
            return path.join(this.route.value, this.permalinks.value);
        };

        common.events.emit('routingType.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }
}

const collection1 = new Collection({
    route: {
        value: '/'
    },
    permalinks: {
        value: '/{settings.permalinks}/'
    },
    config: {
        type: 'posts'
    }
});

const taxonomy1 = new Taxonomy({
    route: {
        value: '/author/'
    },
    config: {
        type: 'users',
        options: {}
    }
});

const taxonomy2 = new Taxonomy({
    route: {
        value: '/tag/'
    },
    config: {
        type: 'tags',
        options: {}
    }
});

const staticPages = new StaticPages({
    route: {
        value: '/'
    },
    config: {
        type: 'pages',
        options: {}
    }
});
