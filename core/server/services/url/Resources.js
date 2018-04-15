'use strict';

const debug = require('ghost-ignition').debug('services:url:resources'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Resource = require('./Resource'),
    models = require('../../models'),
    common = require('../../lib/common');

/**
 * These are the default resources and filters.
 * These are the minimum filters for public accessibility of resources.
 *
 * @TODO:
 * - keep a set of attributes in the url service
 *  - BUT trigger the event with the full set of attributes
 *  - the subscriber should have access to all of them?
 */
const resourcesConfig = [
    {
        type: 'posts',
        modelOptions: {
            modelName: 'Post',
            filter: 'visibility:public+status:published+page:false',
            exclude: [
                'mobiledoc',
                'html',
                'plaintext'
            ],
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
            exclude: [
                'mobiledoc',
                'html',
                'plaintext'
            ],
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
        this._listeners();
    }

    _listeners() {
        /**
         * We fetch the resources as early as possible.
         * Currently the url service needs to use the settings cache,
         * because we need to `settings.permalink`.
         */
        this._onDatabaseReadyListener = this._onDatabaseReady.bind(this);
        common.events.on('db.ready', this._onDatabaseReadyListener);
    }

    _onDatabaseReady() {
        const ops = [];
        debug('db ready. settings cache ready.');

        this._onResourceAddedListener = this._onResourceAdded.bind(this);
        this._onResourceUpdatedListener = this._onResourceUpdated.bind(this);
        this._onResourceRemovedListener = this._onResourceRemoved.bind(this);

        _.each(resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];
            ops.push(this._fetch(resourceConfig));

            common.events.on(resourceConfig.events.add, this._onResourceAddedListener);
            common.events.on(resourceConfig.events.update, this._onResourceUpdatedListener);
            common.events.on(resourceConfig.events.remove, this._onResourceRemovedListener);
        });

        Promise.all(ops)
            .then(() => {
                // CASE: all resources are fetched, start the queue
                this.queue.start({
                    event: 'init',
                    tolerance: 100
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

    _onResourceAdded(model) {
        const type = model.tableName;
        const resource = new Resource(type, model.toJSON());

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
    _onResourceUpdated(model) {
        const type = model.tableName;

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

    _onResourceRemoved(model) {
        const type = model.tableName;
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
        _.each(resourcesConfig, (resourceConfig) => {
            this._onResourceAddedListener && common.events.removeListener(resourceConfig.events.add, this._onResourceAddedListener);
            this._onResourceUpdatedListener && common.events.removeListener(resourceConfig.events.update, this._onResourceUpdatedListener);
            this._onResourceRemovedListener && common.events.removeListener(resourceConfig.events.remove, this._onResourceRemovedListener);
        });

        this._onDatabaseReadyListener && common.events.removeListener('db.ready', this._onDatabaseReadyListener);
        this.data = {};
    }
}

module.exports = Resources;
