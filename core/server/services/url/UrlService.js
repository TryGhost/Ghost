const _debug = require('ghost-ignition').debug._base,
    debug = _debug('ghost:services:url:service'),
    _ = require('lodash'),
    common = require('../../lib/common'),
    UrlGenerator = require('./UrlGenerator'),
    Queue = require('./Queue'),
    Urls = require('./Urls'),
    Resources = require('./Resources'),
    localUtils = require('./utils');

class UrlService {
    constructor() {
        this.utils = localUtils;

        this.finished = false;
        this.urlGenerators = [];

        this.urls = new Urls();
        this.queue = new Queue();
        this.resources = new Resources(this.queue);

        this._listeners();
    }

    _listeners() {
        /**
         * The purpose of this event is to notify the url service as soon as a router get's created.
         */
        this._onRouterAddedListener = this._onRouterAddedType.bind(this);
        common.events.on('router.created', this._onRouterAddedListener);

        this._onThemeChangedListener = this._onThemeChangedListener.bind(this);
        common.events.on('services.themes.api.changed', this._onThemeChangedListener);

        /**
         * The queue will notify us if url generation has started/finished.
         */
        this._onQueueStartedListener = this._onQueueStarted.bind(this);
        this.queue.addListener('started', this._onQueueStartedListener);

        this._onQueueEndedListener = this._onQueueEnded.bind(this);
        this.queue.addListener('ended', this._onQueueEnded.bind(this));
    }

    _onQueueStarted(event) {
        if (event === 'init') {
            this.finished = false;
        }
    }

    _onQueueEnded(event) {
        if (event === 'init') {
            this.finished = true;
        }
    }

    _onRouterAddedType(router) {
        // CASE: there are router types which do not generate resource urls
        //       e.g. static route router
        //       we are listening on the general `router.created` event - every router throws this event
        if (!router || !router.getPermalinks()) {
            return;
        }

        debug('router.created');

        let urlGenerator = new UrlGenerator(router, this.queue, this.resources, this.urls, this.urlGenerators.length);
        this.urlGenerators.push(urlGenerator);
    }

    _onThemeChangedListener() {
        this.reset({keepListeners: true});
        this.init();
    }

    /**
     * You have a url and want to know which the url belongs to.
     *
     * It's in theory possible that multiple resources generate the same url,
     * but they both would serve different content.
     *
     * e.g. if we remove the slug uniqueness and you create a static
     * page and a post with the same slug. And both are served under `/` with the permalink `/:slug/`.
     *
     *
     * Each url is unique and it depends on the hierarchy of router registration is configured.
     * There is no url collision, everything depends on registration order.
     *
     * e.g. posts which live in a collection are stronger than a static page.
     *
     * We only return the resource, which would be served.
     *
     * @NOTE: only accepts relative urls at the moment.
     */
    getResource(url, options) {
        options = options || {};

        let objects = this.urls.getByUrl(url);

        if (!objects.length) {
            if (!this.hasFinished()) {
                throw new common.errors.InternalServerError({
                    message: 'UrlService is processing.',
                    code: 'URLSERVICE_NOT_READY'
                });
            } else {
                return null;
            }
        }

        if (objects.length > 1) {
            objects = _.reduce(objects, (toReturn, object) => {
                if (!toReturn.length) {
                    toReturn.push(object);
                } else {
                    const i1 = _.findIndex(this.urlGenerators, {uid: toReturn[0].generatorId});
                    const i2 = _.findIndex(this.urlGenerators, {uid: object.generatorId});

                    if (i2 < i1) {
                        toReturn = [];
                        toReturn.push(object);
                    }
                }

                return toReturn;
            }, []);
        }

        if (options.returnEverything) {
            return objects[0];
        }

        return objects[0].resource;
    }

    getResourceById(resourceId) {
        const object = this.urls.getByResourceId(resourceId);

        if (!object) {
            throw new common.errors.NotFoundError({
                message: 'Resource not found.',
                code: 'URLSERVICE_RESOURCE_NOT_FOUND'
            });
        }

        return object.resource;
    }

    hasFinished() {
        return this.finished;
    }

    /**
     * Get url by resource id.
     * e.g. tags, authors, posts, pages
     *
     * If we can't find a url for an id, we have to return a url.
     * There are many components in Ghost which call `getUrlByResourceId` and
     * based on the return value, they set the resource url somewhere e.g. meta data.
     * Or if you define no collections in your yaml file and serve a page.
     * You will see a suggestion of posts, but they all don't belong to a collection.
     * They would show localhost:2368/null/.
     */
    getUrlByResourceId(id, options) {
        options = options || {};

        const obj = this.urls.getByResourceId(id);

        if (obj) {
            if (options.absolute) {
                return this.utils.createUrl(obj.url, options.absolute, options.secure);
            }

            if (options.withSubdirectory) {
                return this.utils.createUrl(obj.url, false, options.secure, true);
            }

            return obj.url;
        }

        if (options.absolute) {
            return this.utils.createUrl('/404/', options.absolute, options.secure);
        }

        if (options.withSubdirectory) {
            return this.utils.createUrl('/404/', false, options.secure);
        }

        return '/404/';
    }

    owns(routerId, id) {
        debug('owns', routerId, id);

        let urlGenerator;

        this.urlGenerators.every((_urlGenerator) => {
            if (_urlGenerator.router.identifier === routerId) {
                urlGenerator = _urlGenerator;
                return false;
            }

            return true;
        });

        if (!urlGenerator) {
            return false;
        }

        return urlGenerator.hasId(id);
    }

    getPermalinkByUrl(url, options) {
        options = options || {};

        const object = this.getResource(url, {returnEverything: true});

        if (!object) {
            return null;
        }

        return _.find(this.urlGenerators, {uid: object.generatorId}).router.getPermalinks()
            .getValue(options);
    }

    init() {
        this.resources.fetchResources();
    }

    reset(options = {}) {
        debug('reset');
        this.urlGenerators = [];

        this.urls.reset();
        this.queue.reset();
        this.resources.reset();

        if (!options.keepListeners) {
            this._onQueueStartedListener && this.queue.removeListener('started', this._onQueueStartedListener);
            this._onQueueEndedListener && this.queue.removeListener('ended', this._onQueueEndedListener);
            this._onRouterAddedListener && common.events.removeListener('router.created', this._onRouterAddedListener);
            this._onThemeChangedListener && common.events.removeListener('services.themes.api.changed', this._onThemeChangedListener);
        }
    }

    resetGenerators(options = {}) {
        debug('resetGenerators');
        this.finished = false;
        this.urlGenerators = [];
        this.urls.reset();
        this.queue.reset();

        if (options.releaseResourcesOnly) {
            this.resources.releaseAll();
        } else {
            this.resources.softReset();
        }
    }

    softReset() {
        debug('softReset');
        this.finished = false;
        this.urls.softReset();
        this.queue.softReset();
        this.resources.softReset();
    }
}

module.exports = UrlService;
