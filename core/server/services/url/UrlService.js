'use strict';

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
    constructor(options) {
        options = options || {};

        this.utils = localUtils;

        // You can disable the url preload, in case we encounter a problem with the new url service.
        if (options.disableUrlPreload) {
            return;
        }

        this.finished = false;
        this.urlGenerators = [];

        this.urls = new Urls();
        this.queue = new Queue();
        this.resources = new Resources(this.queue);

        this._listeners();
    }

    _listeners() {
        /**
         * The purpose of this event is to notify the url service as soon as a channel get's created.
         */
        this._onRoutingTypeListener = this._onRoutingType.bind(this);
        common.events.on('routingType.created', this._onRoutingTypeListener);

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

    _onRoutingType(routingType) {
        debug('routingType.created');

        let urlGenerator = new UrlGenerator(routingType, this.queue, this.resources, this.urls, this.urlGenerators.length);
        this.urlGenerators.push(urlGenerator);
    }

    /**
     * You have a url and want to know which the url belongs to.
     * It's in theory possible that multiple resources generate the same url,
     * but they both would serve different content e.g. static pages and collections.
     *
     * We only return the resource, which would be served.
     */
    getResource(url) {
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
            }, []);
        }

        return objects[0].resource;
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

            return obj.url;
        }

        // @TODO: yes/no? reconsider!
        if (options.absolute) {
            return this.utils.createUrl('/404/', options.absolute, options.secure);
        }

        return '/404/';
    }

    reset() {
        debug('reset');
        this.urlGenerators = [];

        this.urls.reset();
        this.queue.reset();
        this.resources.reset();

        this._onQueueStartedListener && this.queue.removeListener('started', this._onQueueStartedListener);
        this._onQueueEndedListener && this.queue.removeListener('ended', this._onQueueEndedListener);
        this._onRoutingTypeListener && common.events.removeListener('routingType.created', this._onRoutingTypeListener);
    }

    softReset() {
        debug('softReset');
        this.urls.softReset();
        this.queue.softReset();
        this.resources.softReset();
    }
}

module.exports = UrlService;
