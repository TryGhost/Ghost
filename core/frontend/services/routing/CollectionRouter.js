const debug = require('ghost-ignition').debug('services:routing:collection-router');
const {events} = require('../../../server/lib/common');
const urlUtils = require('../../../shared/url-utils');
const ParentRouter = require('./ParentRouter');

const controllers = require('./controllers');
const middlewares = require('./middlewares');
const RSSRouter = require('./RSSRouter');

/**
 * @description Collection Router for post resource.
 *
 * Fundamental router to define where resources live and how their url structure is.
 */
class CollectionRouter extends ParentRouter {
    constructor(mainRoute, object, RESOURCE_CONFIG) {
        super('CollectionRouter');

        this.RESOURCE_CONFIG = RESOURCE_CONFIG.QUERY.post;

        this.routerName = mainRoute === '/' ? 'index' : mainRoute.replace(/\//g, '');

        // NOTE: this.route === index/parent route e.g. /, /podcast/, /magic/
        this.route = {
            value: mainRoute
        };

        this.rss = object.rss !== false;

        this.permalinks = {
            originalValue: object.permalink,
            value: object.permalink
        };

        // @NOTE: see helpers/templates - we use unshift to prepend the templates
        this.templates = (object.templates || []).reverse();

        this.filter = object.filter;
        this.data = object.data || {query: {}, router: {}};
        this.order = object.order;
        this.limit = object.limit;

        this.permalinks.getValue = (options) => {
            options = options || {};

            // @NOTE: url options are only required when registering urls in express.
            //        e.g. the UrlService will access the routes and doesn't want to know about possible url options
            if (options.withUrlOptions) {
                return urlUtils.urlJoin(this.permalinks.value, '/:options(edit)?/');
            }

            return this.permalinks.value;
        };

        this.context = [this.routerName];

        debug(this.name, this.route, this.permalinks);

        this._registerRoutes();
        this._listeners();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        // REGISTER: context middleware for this collection
        this.router().use(this._prepareEntriesContext.bind(this));

        // REGISTER: collection route e.g. /, /podcast/
        this.mountRoute(this.route.value, controllers.collection);

        // REGISTER: enable pagination by default
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlUtils.urlJoin(this.route.value, 'page', ':page(\\d+)'), controllers.collection);

        // REGISTER: is rss enabled?
        if (this.rss) {
            this.rssRouter = new RSSRouter();
            this.mountRouter(this.route.value, this.rssRouter.router());
        }

        // REGISTER: context middleware for entries
        this.router().use(this._prepareEntryContext.bind(this));

        // REGISTER: page/post resource redirects
        this.router().param('slug', this._respectDominantRouter.bind(this));

        // REGISTER: permalinks e.g. /:slug/, /podcast/:slug
        this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);

        events.emit('router.created', this);
    }

    /**
     * @description Prepare index context for further middlewares/controllers.
     */
    _prepareEntriesContext(req, res, next) {
        res.routerOptions = {
            type: 'collection',
            filter: this.filter,
            limit: this.limit,
            order: this.order,
            permalinks: this.permalinks.getValue({withUrlOptions: true}),
            resourceType: this.getResourceType(),
            query: this.RESOURCE_CONFIG,
            context: this.context,
            frontPageTemplate: 'home',
            templates: this.templates,
            identifier: this.identifier,
            name: this.routerName,
            data: this.data.query
        };

        next();
    }

    /**
     * @description Prepare entry context for further middlewares/controllers.
     */
    _prepareEntryContext(req, res, next) {
        res.routerOptions.context = ['post'];
        res.routerOptions.type = 'entry';
        next();
    }

    /**
     * @description This router has listeners to react on changes which happen in Ghost.
     * @private
     */
    _listeners() {
        /**
         * CASE: timezone changes
         *
         * If your permalink contains a date reference, we have to regenerate the urls.
         *
         * e.g. /:year/:month/:day/:slug/ or /:day/:slug/
         */
        this._onTimezoneEditedListener = this._onTimezoneEdited.bind(this);
        events.on('settings.timezone.edited', this._onTimezoneEditedListener);
    }

    /**
     * @description Helper function to handle a timezone change.
     * @param settingModel
     * @private
     */
    _onTimezoneEdited(settingModel) {
        const newTimezone = settingModel.attributes.value;
        const previousTimezone = settingModel._previousAttributes.value;

        if (newTimezone === previousTimezone) {
            return;
        }

        if (this.getPermalinks().getValue().match(/:year|:month|:day/)) {
            debug('_onTimezoneEdited: trigger regeneration');

            // @NOTE: The connected url generator will listen on this event and regenerate urls.
            this.emit('updated');
        }
    }

    /**
     * @description Get resource type of this router (always "posts")
     * @returns {string}
     */
    getResourceType() {
        // @TODO: resourceAlias can be removed? We removed it. Looks like a last left over. Needs double checking.
        return this.RESOURCE_CONFIG.resourceAlias || this.RESOURCE_CONFIG.resource;
    }

    /**
     * @description Get index route e.g. /, /blog/
     * @param {Object} options
     * @returns {String}
     */
    getRoute(options) {
        options = options || {};

        return urlUtils.createUrl(this.route.value, options.absolute, options.secure);
    }

    /**
     * @description Generate rss url.
     * @param {Object} options
     * @returns {String}
     */
    getRssUrl(options) {
        if (!this.rss) {
            return null;
        }

        return urlUtils.createUrl(urlUtils.urlJoin(this.route.value, this.rssRouter.route.value), options.absolute, options.secure);
    }

    reset() {
        if (this._onTimezoneEditedListener) {
            events.removeListener('settings.timezone.edited', this._onTimezoneEditedListener);
        }
    }
}

module.exports = CollectionRouter;
