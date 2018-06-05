const debug = require('ghost-ignition').debug('services:routing:collection-router');
const common = require('../../lib/common');
const settingsCache = require('../settings/cache');
const urlService = require('../url');
const ParentRouter = require('./ParentRouter');

const controllers = require('./controllers');
const middlewares = require('./middlewares');
const RSSRouter = require('./RSSRouter');

class CollectionRouter extends ParentRouter {
    constructor(indexRoute, object) {
        super('CollectionRouter');

        // NOTE: index/parent route e.g. /, /podcast/, /magic/ ;)
        this.route = {
            value: indexRoute
        };

        this.permalinks = {
            originalValue: object.permalink,
            value: object.permalink
        };

        this.templates = object.template || [];

        this.filter = object.filter || 'page:false';

        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.permalinks.originalValue.match(/globals\.permalinks/)) {
            this.permalinks.originalValue = this.permalinks.originalValue.replace('{globals.permalinks}', '{settings.permalinks}');
            this.permalinks.value = this.permalinks.originalValue.replace('{settings.permalinks}', settingsCache.get('permalinks'));
            this.permalinks.value = urlService.utils.deduplicateDoubleSlashes(this.permalinks.value);
        }

        this.permalinks.getValue = (options) => {
            options = options || {};

            // @NOTE: url options are only required when registering urls in express.
            //        e.g. the UrlService will access the routes and doesn't want to know about possible url options
            if (options.withUrlOptions) {
                return urlService.utils.urlJoin(this.permalinks.value, '/:options(edit)?/');
            }

            return this.permalinks.value;
        };

        debug(this.route, this.permalinks);

        this._registerRoutes();
        this._listeners();
    }

    _registerRoutes() {
        // REGISTER: context middleware for this collection
        this.router().use(this._prepareIndexContext.bind(this));

        // REGISTER: collection route e.g. /, /podcast/
        this.mountRoute(this.route.value, controllers.collection);

        // REGISTER: enable pagination by default
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.route.value, 'page', ':page(\\d+)'), controllers.collection);

        this.rssRouter =  new RSSRouter();

        // REGISTER: enable rss by default
        this.mountRouter(this.route.value, this.rssRouter.router());

        // REGISTER: context middleware for entries
        this.router().use(this._prepareEntryContext.bind(this));

        // REGISTER: permalinks e.g. /:slug/, /podcast/:slug
        this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);

        common.events.emit('router.created', this);
    }

    /**
     * We attach context information of the router to the request.
     * By this we can e.g. access the router options in controllers.
     *
     * @TODO: Why do we need two context objects? O_O - refactor this out
     */
    _prepareIndexContext(req, res, next) {
        res.locals.routerOptions = {
            filter: this.filter,
            permalinks: this.permalinks.getValue({withUrlOptions: true}),
            type: this.getType(),
            context: ['home'],
            frontPageTemplate: 'home',
            templates: this.templates.reverse(),
            identifier: this.identifier
        };

        res._route = {
            type: 'collection'
        };

        next();
    }

    _prepareEntryContext(req, res, next) {
        res.locals.routerOptions.context = ['post'];
        res._route.type = 'entry';
        next();
    }

    _listeners() {
        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.getPermalinks() && this.getPermalinks().originalValue.match(/settings\.permalinks/)) {
            this._onPermalinksEditedListener = this._onPermalinksEdited.bind(this);
            common.events.on('settings.permalinks.edited', this._onPermalinksEditedListener);
        }
    }

    /**
     * We unmount and mount the permalink url. This enables the ability to change urls on runtime.
     */
    _onPermalinksEdited() {
        this.unmountRoute(this.permalinks.getValue({withUrlOptions: true}));

        this.permalinks.value = this.permalinks.originalValue.replace('{settings.permalinks}', settingsCache.get('permalinks'));
        this.permalinks.value = urlService.utils.deduplicateDoubleSlashes(this.permalinks.value);

        this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);
        this.emit('updated');
    }

    getType() {
        return 'posts';
    }

    getRoute(options) {
        options = options || {};

        return urlService.utils.createUrl(this.route.value, options.absolute, options.secure);
    }

    getRssUrl(options) {
        return urlService.utils.createUrl(urlService.utils.urlJoin(this.route.value, this.rssRouter.route.value), options.absolute, options.secure);
    }

    reset() {
        if (!this._onPermalinksEditedListener) {
            return;
        }

        common.events.removeListener('settings.permalinks.edited', this._onPermalinksEditedListener);
    }
}

module.exports = CollectionRouter;
