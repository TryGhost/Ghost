const debug = require('ghost-ignition').debug('services:url:resources'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Resource = require('./Resource'),
    models = require('../../models'),
    common = require('../../lib/common');

/**
 * These are the default resources and filters.
 * These are the minimum filters for public accessibility of resources.
 */
const resourcesConfig = [
    {
        type: 'posts',
        modelOptions: {
            modelName: 'Post',
            filter: 'visibility:public+status:published+page:false',
            reducedFields: true,
            withRelated: ['tags', 'authors'],
            withRelatedFields: {
                tags: ['tags.id', 'tags.slug'],
                authors: ['users.id', 'users.slug']
            }
        },
        events: {
            add: 'post.published',
            update: 'post.published.edited',
            remove: 'post.unpublished'
        }
    },
    {
        type: 'pages',
        modelOptions: {
            modelName: 'Post',
            reducedFields: true,
            filter: 'visibility:public+status:published+page:true'
        },
        events: {
            add: 'page.published',
            update: 'page.published.edited',
            remove: 'page.unpublished'
        }
    },
    {
        type: 'tags',
        keep: ['id', 'slug', 'updated_at', 'created_at'],
        modelOptions: {
            modelName: 'Tag',
            reducedFields: true,
            filter: 'visibility:public'
        },
        events: {
            add: 'tag.added',
            update: 'tag.edited',
            remove: 'tag.deleted'
        }
    },
    {
        type: 'users',
        modelOptions: {
            modelName: 'User',
            reducedFields: true,
            filter: 'visibility:public'
        },
        events: {
            add: 'user.activated',
            update: 'user.activated.edited',
            remove: 'user.deactivated'
        }
    }
];

/**
 * NOTE: We are querying knex directly, because the Bookshelf ORM overhead is too slow.
 */
class Resources {
    constructor(queue) {
        this.queue = queue;
        this.data = {};

        this.listeners = [];
        this._listeners();
    }

    _listenOn(eventName, listener) {
        this.listeners.push({
            eventName: eventName,
            listener: listener
        });

        common.events.on(eventName, listener);
    }

    _listeners() {
        /**
         * We fetch the resources as early as possible.
         * Currently the url service needs to use the settings cache,
         * because we need to `settings.permalink`.
         */
        this._listenOn('db.ready', this._onDatabaseReady.bind(this));
    }

    _onDatabaseReady() {
        const ops = [];
        debug('db ready. settings cache ready.');

        _.each(resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];
            ops.push(this._fetch(resourceConfig));

            this._listenOn(resourceConfig.events.add, (model) => {
                return this._onResourceAdded.bind(this)(resourceConfig.type, model);
            });

            this._listenOn(resourceConfig.events.update, (model) => {
                return this._onResourceUpdated.bind(this)(resourceConfig.type, model);
            });

            this._listenOn(resourceConfig.events.remove, (model) => {
                return this._onResourceRemoved.bind(this)(resourceConfig.type, model);
            });
        });

        Promise.all(ops)
            .then(() => {
                // CASE: all resources are fetched, start the queue
                this.queue.start({
                    event: 'init',
                    tolerance: 100,
                    requiredSubscriberCount: 1
                });
            });
    }

    _fetch(resourceConfig) {
        debug('_fetch', resourceConfig.type, resourceConfig.modelOptions);

        return models.Base.Model.raw_knex.fetchAll(resourceConfig.modelOptions)
            .then((objects) => {
                debug('fetched', resourceConfig.type, objects.length);

                _.each(objects, (object) => {
                    this.data[resourceConfig.type].push(new Resource(resourceConfig.type, object));
                });
            });
    }

    _onResourceAdded(type, model) {
        const resource = new Resource(type, model.toJSON());

        debug('_onResourceAdded', type);
        this.data[type].push(resource);

        this.queue.start({
            event: 'added',
            action: 'added:' + model.id,
            eventData: {
                id: model.id,
                type: type
            }
        });
    }

    /**
     * CASE:
     *  - post was fetched on bootstrap
     *  - that means, the post is already published
     *  - resource exists, but nobody owns it
     *  - if the model changes, it can be that somebody will then own the post
     *
     * CASE:
     *   - post was fetched on bootstrap
     *   - that means, the post is already published
     *   - resource exists and is owned by somebody
     *   - but the data changed and is maybe no longer owned?
     *   - e.g. featured:false changes and your filter requires featured posts
     */
    _onResourceUpdated(type, model) {
        debug('_onResourceUpdated', type);

        this.data[type].every((resource) => {
            if (resource.data.id === model.id) {
                resource.update(model.toJSON());

                // CASE: pretend it was added
                if (!resource.isReserved()) {
                    this.queue.start({
                        event: 'added',
                        action: 'added:' + model.id,
                        eventData: {
                            id: model.id,
                            type: type
                        }
                    });
                }

                // break!
                return false;
            }

            return true;
        });
    }

    _onResourceRemoved(type, model) {
        let index = null;
        let resource;

        this.data[type].every((_resource, _index) => {
            if (_resource.data.id === model._previousAttributes.id) {
                resource = _resource;
                index = _index;
                // break!
                return false;
            }

            return true;
        });

        // CASE: there are possible cases that the resource was not fetched e.g. visibility is internal
        if (index === null) {
            debug('can\'t find resource', model._previousAttributes.id);
            return;
        }

        delete this.data[type][index];
        resource.remove();
    }

    getAll() {
        return this.data;
    }

    getAllByType(type) {
        return this.data[type];
    }

    getByIdAndType(type, id) {
        return _.find(this.data[type], {data: {id: id}});
    }

    reset() {
        _.each(this.listeners, (obj) => {
            common.events.removeListener(obj.eventName, obj.listener);
        });

        this.listeners = [];
        this.data = {};
    }

    softReset() {
        this.data = {};

        _.each(resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];
        });
    }
}

module.exports = Resources;
