const _ = require('lodash'),
    jsonpath = require('jsonpath'),
    debug = require('ghost-ignition').debug('services:url:generator'),
    localUtils = require('./utils'),
    /**
     * @TODO: This is a fake version of the upcoming GQL tool.
     * GQL will offer a tool to match a JSON against a filter.
     */
    transformFilter = (filter) => {
        filter = '$[?(' + filter + ')]';
        filter = filter.replace(/(\w+):(\w+)/g, '@.$1 == "$2"');
        filter = filter.replace(/"true"/g, 'true');
        filter = filter.replace(/"false"/g, 'false');
        filter = filter.replace(/"0"/g, '0');
        filter = filter.replace(/"1"/g, '1');
        filter = filter.replace(/\+/g, ' && ');
        return filter;
    };

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
            this.filter = transformFilter(this.router.getFilter());
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
        const resources = this.resources.getAllByType(this.router.getType());

        _.each(resources, (resource) => {
            this._try(resource);
        });
    }

    _onAdded(event) {
        debug('onAdded', this.toString());

        // CASE: you are type "pages", but the incoming type is "users"
        if (event.type !== this.router.getType()) {
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
        } else if (jsonpath.query(resource, this.filter).length) {
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
     * We currently generate relative urls.
     */
    _generateUrl(resource) {
        const permalink = this.router.getPermalinks().getValue();
        const url = localUtils.replacePermalink(permalink, resource.data);

        return localUtils.createUrl(url, false, false, true);
    }

    /**
     * I want to know if my resources changes.
     * Register events of resource.
     */
    _resourceListeners(resource) {
        const onUpdate = (updatedResource) => {
            // 1. remove old resource
            this.urls.removeResourceId(updatedResource.data.id);

            // 2. free resource, the url <-> resource connection no longer exists
            updatedResource.release();

            // 3. try to own the resource again
            // Imagine you change `featured` to true and your filter excludes featured posts.
            const isMine = this._try(updatedResource);

            // 4. if the resource is no longer mine, tell the others
            // e.g. post -> page
            // e.g. post is featured now
            if (!isMine) {
                debug('free, this is not mine anymore', updatedResource.data.id);

                this.queue.start({
                    event: 'added',
                    action: 'added:' + resource.data.id,
                    eventData: {
                        id: resource.data.id,
                        type: this.router.getType()
                    }
                });
            }
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
