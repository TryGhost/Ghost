const debug = require('ghost-ignition').debug('services:url:resources'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Resource = require('./Resource'),
    config = require('../../config'),
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
            exclude: [
                'title',
                'mobiledoc',
                'html',
                'plaintext',
                'amp',
                'codeinjection_head',
                'codeinjection_foot',
                'meta_title',
                'meta_description',
                'custom_excerpt',
                'og_image',
                'og_title',
                'og_description',
                'twitter_image',
                'twitter_title',
                'twitter_description',
                'custom_template',
                'feature_image',
                'locale'
            ],
            withRelated: ['tags', 'authors'],
            withRelatedPrimary: {
                primary_tag: 'tags',
                primary_author: 'authors'
            },
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
                'title',
                'mobiledoc',
                'html',
                'plaintext',
                'amp',
                'codeinjection_head',
                'codeinjection_foot',
                'meta_title',
                'meta_description',
                'custom_excerpt',
                'og_image',
                'og_title',
                'og_description',
                'twitter_image',
                'twitter_title',
                'twitter_description',
                'custom_template',
                'feature_image',
                'locale',
                'tags',
                'authors',
                'primary_tag',
                'primary_author'
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
            exclude: [
                'description',
                'meta_title',
                'meta_description'
            ],
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
            exclude: [
                'bio',
                'website',
                'location',
                'facebook',
                'twitter',
                'accessibility',
                'meta_title',
                'meta_description',
                'tour'
            ],
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

    _fetch(resourceConfig, options = {offset: 0, limit: 999}) {
        debug('_fetch', resourceConfig.type, resourceConfig.modelOptions);

        let modelOptions = _.cloneDeep(resourceConfig.modelOptions);
        const isSQLite = config.get('database:client') === 'sqlite3';

        // CASE: prevent "too many SQL variables" error on SQLite3
        if (isSQLite) {
            modelOptions.offset = options.offset;
            modelOptions.limit = options.limit;
        }

        return models.Base.Model.raw_knex.fetchAll(modelOptions)
            .then((objects) => {
                debug('fetched', resourceConfig.type, objects.length);

                _.each(objects, (object) => {
                    this.data[resourceConfig.type].push(new Resource(resourceConfig.type, object));
                });

                if (objects.length && isSQLite) {
                    options.offset = options.offset + options.limit;
                    return this._fetch(resourceConfig, {offset: options.offset, limit: options.limit});
                }
            });
    }

    _onResourceAdded(type, model) {
        const resourceConfig = _.find(resourcesConfig, {type: type});
        const exclude = resourceConfig.modelOptions.exclude;
        const withRelatedFields = resourceConfig.modelOptions.withRelatedFields;
        const obj = _.omit(model.toJSON(), exclude);

        if (withRelatedFields) {
            _.each(withRelatedFields, (fields, key) => {
                if (!obj[key]) {
                    return;
                }

                obj[key] = _.map(obj[key], (relation) => {
                    const relationToReturn = {};

                    _.each(fields, (field) => {
                        const fieldSanitized = field.replace(/^\w+./, '');
                        relationToReturn[fieldSanitized] = relation[fieldSanitized];
                    });

                    return relationToReturn;
                });
            });

            const withRelatedPrimary = resourceConfig.modelOptions.withRelatedPrimary;

            if (withRelatedPrimary) {
                _.each(withRelatedPrimary, (relation, primaryKey) => {
                    if (!obj[primaryKey] || !obj[relation]) {
                        return;
                    }

                    const targetTagKeys = Object.keys(obj[relation].find((item) => {return item.id === obj[primaryKey].id;}));
                    obj[primaryKey] = _.pick(obj[primaryKey], targetTagKeys);
                });
            }
        }

        const resource = new Resource(type, obj);

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
                const resourceConfig = _.find(resourcesConfig, {type: type});
                const exclude = resourceConfig.modelOptions.exclude;
                const withRelatedFields = resourceConfig.modelOptions.withRelatedFields;
                const obj = _.omit(model.toJSON(), exclude);

                if (withRelatedFields) {
                    _.each(withRelatedFields, (fields, key) => {
                        if (!obj[key]) {
                            return;
                        }

                        obj[key] = _.map(obj[key], (relation) => {
                            const relationToReturn = {};

                            _.each(fields, (field) => {
                                const fieldSanitized = field.replace(/^\w+./, '');
                                relationToReturn[fieldSanitized] = relation[fieldSanitized];
                            });

                            return relationToReturn;
                        });
                    });

                    const withRelatedPrimary = resourceConfig.modelOptions.withRelatedPrimary;

                    if (withRelatedPrimary) {
                        _.each(withRelatedPrimary, (relation, primaryKey) => {
                            if (!obj[primaryKey] || !obj[relation]) {
                                return;
                            }

                            const targetTagKeys = Object.keys(obj[relation].find((item) => {return item.id === obj[primaryKey].id;}));
                            obj[primaryKey] = _.pick(obj[primaryKey], targetTagKeys);
                        });
                    }
                }

                resource.update(obj);

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

        this.data[type].splice(index, 1);
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

    releaseAll() {
        _.each(this.data, (resources, type) => {
            _.each(this.data[type], (resource) => {
                resource.release();
            });
        });
    }
}

module.exports = Resources;
