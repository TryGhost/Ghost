const _ = require('lodash'),
    nql = require('@nexes/nql'),
    debug = require('ghost-ignition').debug('services:url:generator'),
    localUtils = require('./utils'),

    aliases = {author: 'authors.slug', tags: 'tags.slug', tag: 'tags.slug', authors: 'authors.slug'};

class UrlGenerator {
    constructor(router, queue, resources, urls, position) {
        this.router = router;
        this.queue = queue;
        this.urls = urls;
        this.resources = resources;
        this.uid = position;

        debug('constructor', this.toString());

        // CASE: routers can define custom filters, but not required.
        if (this.router.getFilter()) {
            this.filter = this.router.getFilter();
            this.nql = nql(this.filter, {aliases});
            debug('filter', this.filter);
        }

        this._listeners();
    }

    _listeners() {
        /**
         * @NOTE: currently only used if the permalink setting changes and it's used for this url generator.
         * @TODO: remove in Ghost 2.0
         */
        this.router.addListener('updated', () => {
            const myResources = this.urls.getByGeneratorId(this.uid);

            myResources.forEach((object) => {
                this.urls.removeResourceId(object.resource.data.id);
                object.resource.release();
                this._try(object.resource);
            });
        });

        /**
         * Listen on two events:
         *
         * - init: bootstrap or url reset
         * - added: resource was added
         */
        this.queue.register({
            event: 'init',
            tolerance: 100
        }, this._onInit.bind(this));

        // @TODO: listen on added event per type (post optimisation)
        this.queue.register({
            event: 'added'
        }, this._onAdded.bind(this));
    }

    _onInit() {
        debug('_onInit', this.toString());

        // @NOTE: get the resources of my type e.g. posts.
        const resources = this.resources.getAllByType(this.router.getResourceType());

        _.each(resources, (resource) => {
            this._try(resource);
        });
    }

    _onAdded(event) {
        debug('onAdded', this.toString());

        // CASE: you are type "pages", but the incoming type is "users"
        if (event.type !== this.router.getResourceType()) {
            return;
        }

        const resource = this.resources.getByIdAndType(event.type, event.id);

        this._try(resource);
    }

    _try(resource) {
        /**
         * CASE: another url generator has taken this resource already.
         *
         * We have to remember that, because each url generator can generate a different url
         * for a resource. So we can't directly check `this.urls.getUrl(url)`.
         */
        if (resource.isReserved()) {
            return false;
        }

        const url = this._generateUrl(resource);

        // CASE 1: route has no custom filter, it will own the resource for sure
        // CASE 2: find out if my filter matches the resource
        if (!this.filter) {
            this.urls.add({
                url: url,
                generatorId: this.uid,
                resource: resource
            });

            resource.reserve();
            this._resourceListeners(resource);
            return true;
        } else if (this.nql.queryJSON(resource.data)) {
            this.urls.add({
                url: url,
                generatorId: this.uid,
                resource: resource
            });

            resource.reserve();
            this._resourceListeners(resource);
            return true;
        } else {
            return false;
        }
    }

    /**
     * We currently generate relative urls without subdirectory.
     */
    _generateUrl(resource) {
        const permalink = this.router.getPermalinks().getValue();
        return localUtils.replacePermalink(permalink, resource.data);
    }

    /**
     * I want to know if my resources changes.
     * Register events of resource.
     *
     * If the owned resource get's updated, we simply release/free the resource and push it back to the queue.
     * This is the easiest, less error prone implementation.
     *
     * Imagine you have two collections: `featured:true` and `page:false`.
     * If a published post status get's featured and you have not explicitly defined `featured:false`, we wouldn't
     * be able to figure out if this resource still belongs to me, because the filter still matches.
     */
    _resourceListeners(resource) {
        const onUpdate = (updatedResource) => {
            // 1. remove old resource
            this.urls.removeResourceId(updatedResource.data.id);

            // 2. free resource, the url <-> resource connection no longer exists
            updatedResource.release();

            // 3. post has the change to get owned from a different collection again
            debug('put back in queue', updatedResource.data.id);

            this.queue.start({
                event: 'added',
                action: 'added:' + resource.data.id,
                eventData: {
                    id: resource.data.id,
                    type: this.router.getResourceType()
                }
            });
        };

        const onRemoved = (removedResource) => {
            this.urls.removeResourceId(removedResource.data.id);
            removedResource.release();
        };

        resource.removeAllListeners();
        resource.addListener('updated', onUpdate.bind(this));
        resource.addListener('removed', onRemoved.bind(this));
    }

    hasUrl(url) {
        const existingUrl = this.urls.getByUrl(url);

        if (existingUrl.length && existingUrl[0].generatorId === this.uid) {
            return true;
        }

        return false;
    }

    getUrls() {
        return this.urls.getByGeneratorId(this.uid);
    }

    toString() {
        return this.router.toString();
    }
}

module.exports = UrlGenerator;
