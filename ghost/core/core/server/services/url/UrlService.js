const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:services:url:service');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const labs = require('../../../shared/labs');
const UrlGenerator = require('./UrlGenerator');
const Queue = require('./Queue');
const Urls = require('./Urls');
const Resources = require('./Resources');
const urlUtils = require('../../../shared/url-utils');

/**
 * The url service class holds all instances in a centralized place.
 * It's the public API you can talk to.
 * It will tell you if the url generation is in progress or not.
 */
class UrlService {
    /**
     *
     * @param {Object} options
     * @param {Object} [options.cache] - cache handler instance
     * @param {Function} [options.cache.read] - read cache by type
     * @param {Function} [options.cache.write] - write into cache by type
     */
    constructor({cache} = {}) {
        this.utils = urlUtils;
        this.cache = cache;
        this.onFinished = null;
        this.finished = false;
        this.urlGenerators = [];

        // Get urls
        this.queue = new Queue();
        // NOTE: Urls and Resources should not be initialized here but only in the init method.
        //      Way too many tests fail if the initialization is removed so leaving it as is for time being
        this.urls = new Urls();
        this.resources = new Resources({
            queue: this.queue
        });

        this._listeners();
    }

    /**
     * @description Helper function to register the listeners for this instance.
     * @private
     */
    _listeners() {
        this._onQueueStartedListener = this._onQueueStarted.bind(this);
        this.queue.addListener('started', this._onQueueStartedListener);

        this._onQueueEndedListener = this._onQueueEnded.bind(this);
        this.queue.addListener('ended', this._onQueueEnded.bind(this));
    }

    /**
     * @description The queue will notify us if the queue has started with an event.
     *
     * The "init" event is basically the bootstrap event, which is the siganliser if url generation
     * is in progress or not.
     *
     * @param {String} event
     * @private
     */
    _onQueueStarted(event) {
        if (event === 'init') {
            this.finished = false;
        }
    }

    /**
     * @description The queue will notify us if the queue has ended with an event.
     * @param {String} event
     * @private
     */
    _onQueueEnded(event) {
        if (event === 'init') {
            this.finished = true;
            if (this.onFinished) {
                this.onFinished();
            }
        }
    }

    /**
     * @description Router was created, connect it with a url generator.
     * @param {String} identifier frontend router ID reference
     * @param {String} filter NQL filter
     * @param {String} resourceType
     * @param {String} permalink
     */
    onRouterAddedType(identifier, filter, resourceType, permalink) {
        debug('Registering route: ', filter, resourceType, permalink);

        let urlGenerator = new UrlGenerator({
            identifier,
            filter,
            resourceType,
            permalink,
            queue: this.queue,
            resources: this.resources,
            urls: this.urls,
            position: this.urlGenerators.length
        });
        this.urlGenerators.push(urlGenerator);
    }

    /**
     * @description Router update handler - regenerates it's resources
     * @param {String} identifier router ID linked to the UrlGenerator
     */
    onRouterUpdated(identifier) {
        const generator = this.urlGenerators.find(g => g.identifier === identifier);
        generator.regenerateResources();
    }

    /**
     * @description Get Resource by url.
     *
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
     *
     * @param {String} url
     * @param {Object} options
     * @returns {Object}
     */
    getResource(url, options) {
        options = options || {};

        let objects = this.urls.getByUrl(url);

        if (!objects.length) {
            if (!this.hasFinished()) {
                throw new errors.InternalServerError({
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

    /**
     * @description Get resource by id.
     * @param {String} resourceId
     * @returns {Object}
     */
    getResourceById(resourceId) {
        const object = this.urls.getByResourceId(resourceId);

        if (!object) {
            throw new errors.NotFoundError({
                message: 'Resource not found.',
                code: 'URLSERVICE_RESOURCE_NOT_FOUND'
            });
        }

        return object.resource;
    }

    /**
     * @description Figure out if url generation is in progress or not.
     * @returns {boolean}
     */
    hasFinished() {
        return this.finished;
    }

    /**
     * @description Get url by resource id.
     *
     * If we can't find a url for an id, we have to return a url.
     * There are many components in Ghost which call `getUrlByResourceId` and
     * based on the return value, they set the resource url somewhere e.g. meta data.
     * Or if you define no collections in your yaml file and serve a page.
     * You will see a suggestion of posts, but they all don't belong to a collection.
     * They would show localhost:2368/null/.
     *
     * @param {String} id
     * @param {Object} options
     * @param {Object} [options.absolute]
     * @param {Object} [options.withSubdirectory]
     * @returns {String}
     */
    getUrlByResourceId(id, options) {
        options = options || {};

        const obj = this.urls.getByResourceId(id);

        if (obj) {
            if (options.absolute) {
                return this.utils.createUrl(obj.url, options.absolute);
            }

            if (options.withSubdirectory) {
                return this.utils.createUrl(obj.url, false, true);
            }

            return obj.url;
        }

        if (options.absolute) {
            return this.utils.createUrl('/404/', options.absolute);
        }

        if (options.withSubdirectory) {
            return this.utils.createUrl('/404/', false);
        }

        return '/404/';
    }

    /**
     * @description Check whether a router owns a resource id.
     * @param {String} routerId
     * @param {String} id
     * @returns {boolean}
     */
    owns(routerId, id) {
        debug('owns', routerId, id);

        let urlGenerator;

        this.urlGenerators.every((_urlGenerator) => {
            if (_urlGenerator.identifier === routerId) {
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

    /**
     * @description Get permlink structure for url.
     * @param {String} url
     * @param {object} options
     * @returns {*}
     */
    getPermalinkByUrl(url, options) {
        options = options || {};

        const object = this.getResource(url, {returnEverything: true});

        if (!object) {
            return null;
        }

        const permalink = _.find(this.urlGenerators, {uid: object.generatorId}).permalink;

        if (options.withUrlOptions) {
            return urlUtils.urlJoin(permalink, '/:options(edit)?/');
        }

        return permalink;
    }

    /**
     * @description Initializes components needed for the URL Service to function
     * @param {Object} options
     * @param {Function} [options.onFinished] - callback when url generation is finished
     * @param {Boolean} [options.urlCache] - whether to init using url cache or not
     */
    async init({onFinished, urlCache} = {}) {
        this.onFinished = onFinished;

        let persistedUrls;
        let persistedResources;

        if (this.cache && (labs.isSet('urlCache') || urlCache)) {
            persistedUrls = await this.cache.read('urls');
            persistedResources = await this.cache.read('resources');
        }

        if (persistedUrls && persistedResources) {
            this.urls.urls = persistedUrls;
            this.resources.data = persistedResources;
            this.resources.initResourceConfig();
            this.resources.initEvenListeners();

            this._onQueueEnded('init');
        } else {
            this.resources.initResourceConfig();
            this.resources.initEvenListeners();
            await this.resources.fetchResources();
            // CASE: all resources are fetched, start the queue
            this.queue.start({
                event: 'init',
                tolerance: 100,
                requiredSubscriberCount: 1
            });
        }
    }

    async shutdown() {
        if (!labs.isSet('urlCache')) {
            return null;
        }

        await this.cache.write('urls', this.urls.urls);
        await this.cache.write('resources', this.resources.getAll());
    }

    /**
     * @description Reset this service.
     * @param {Object} options
     */
    reset(options = {}) {
        debug('reset');
        this.urlGenerators = [];

        this.urls.reset();
        this.queue.reset();
        this.resources.reset();

        if (!options.keepListeners) {
            this._onQueueStartedListener && this.queue.removeListener('started', this._onQueueStartedListener);
            this._onQueueEndedListener && this.queue.removeListener('ended', this._onQueueEndedListener);
        }
    }

    /**
     * @description Reset the generators.
     * @param {Object} options
     */
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

    /**
     * @description Soft reset this service. Only used in test env.
     */
    softReset() {
        debug('softReset');
        this.finished = false;
        this.urls.softReset();
        this.queue.softReset();
        this.resources.softReset();
    }
}

module.exports = UrlService;
