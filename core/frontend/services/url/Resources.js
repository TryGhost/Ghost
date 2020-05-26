const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('services:url:resources');
const Resource = require('./Resource');
const config = require('../../../shared/config');
const models = require('../../../server/models');
const {events} = require('../../../server/lib/common');

/**
 * @description At the moment the resources class is directly responsible for data population
 * for URLs...but because it's actually a storage cache of all published
 * resources in the system, could also be used as a cache for Content API in
 * the future.
 *
 * Each entry in the database will be represented by a "Resource" (see /Resource.js).
 */
class Resources {
    constructor(queue) {
        this.queue = queue;
        this.resourcesConfig = [];
        this.data = {};

        this.listeners = [];
        this._listeners();
    }

    /**
     * @description Little helper to register on Ghost events and remember the listener functions to be able
     * to unsubscribe.
     *
     * @param {String} eventName
     * @param {Function} listener
     * @private
     */
    _listenOn(eventName, listener) {
        this.listeners.push({
            eventName: eventName,
            listener: listener
        });

        events.on(eventName, listener);
    }

    /**
     * @description Little helper which get's called on class instantiation. It will subscribe to the
     *              database ready event to start fetching the data as early as possible.
     *
     * @private
     */
    _listeners() {
        this._listenOn('db.ready', this.fetchResources.bind(this));
    }

    /**
     * @description Initialise the resource config. We currently fetch the data straight via the the model layer,
     *              but because Ghost supports multiple API versions, we have to ensure we load the correct data.
     *
     * @TODO: https://github.com/TryGhost/Ghost/issues/10360
     * @private
     */
    _initResourceConfig() {
        if (!_.isEmpty(this.resourcesConfig)) {
            return this.resourceConfig;
        }

        this.resourcesAPIVersion = require('../themes').getApiVersion();
        this.resourcesConfig = require(`./configs/${this.resourcesAPIVersion}`);
    }

    /**
     * @description Helper function to initialise data fetching. Each resource type needs to register resource/model
     *              events to get notified about updates/deletions/inserts.
     */
    fetchResources() {
        const ops = [];
        debug('fetchResources');

        this._initResourceConfig();

        // NOTE: Iterate over all resource types (posts, users etc..) and call `_fetch`.
        _.each(this.resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];

            // NOTE: We are querying knex directly, because the Bookshelf ORM overhead is too slow.
            ops.push(this._fetch(resourceConfig));

            this._listenOn(resourceConfig.events.add, (model) => {
                return this._onResourceAdded.bind(this)(resourceConfig.type, model);
            });

            if (_.isArray(resourceConfig.events.update)) {
                resourceConfig.events.update.forEach((event) => {
                    this._listenOn(event, (model) => {
                        return this._onResourceUpdated.bind(this)(resourceConfig.type, model);
                    });
                });
            } else {
                this._listenOn(resourceConfig.events.update, (model) => {
                    return this._onResourceUpdated.bind(this)(resourceConfig.type, model);
                });
            }

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

    /**
     * @description The actual call to the model layer, which will execute raw knex queries to ensure performance.
     * @param {Object} resourceConfig
     * @param {Object} options
     * @returns {Promise}
     * @private
     */
    _fetch(resourceConfig, options = {offset: 0, limit: 999}) {
        debug('_fetch', resourceConfig.type, resourceConfig.modelOptions);

        let modelOptions = _.cloneDeep(resourceConfig.modelOptions);
        const isSQLite = config.get('database:client') === 'sqlite3';

        // CASE: prevent "too many SQL variables" error on SQLite3 (https://github.com/TryGhost/Ghost/issues/5810)
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

    /**
     * @description Call the model layer to fetch a single resource via raw knex queries.
     *
     * This function was invented, because the model event is a generic event, which is independent of any
     * api version behaviour. We have to ensure that a model matches the conditions of the configured api version
     * in the theme.
     *
     * See https://github.com/TryGhost/Ghost/issues/10124.
     *
     * @param {Object} resourceConfig
     * @param {String} id
     * @returns {Promise}
     * @private
     */
    _fetchSingle(resourceConfig, id) {
        let modelOptions = _.cloneDeep(resourceConfig.modelOptions);
        modelOptions.id = id;

        return models.Base.Model.raw_knex.fetchAll(modelOptions);
    }

    /**
     * @description Helper function to prepare the received model's relations.
     *
     * This helper was added to reduce the number of fields we keep in cache for relations.
     *
     * If we resolve (https://github.com/TryGhost/Ghost/issues/10360) and talk to the Content API,
     * we could pass on e.g. `?include=authors&fields=authors.id,authors.slug`, but the API has to support it.
     *
     * @param {Bookshelf-Model} model
     * @param {Object} resourceConfig
     * @private
     */
    _prepareModelSync(model, resourceConfig) {
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

                    const targetTagKeys = Object.keys(obj[relation].find((item) => {
                        return item.id === obj[primaryKey].id;
                    }));
                    obj[primaryKey] = _.pick(obj[primaryKey], targetTagKeys);
                });
            }
        }

        return obj;
    }

    /**
     * @description Listener for "model added" event.
     *
     * If we receive an event from the model layer, we push the new resource into the queue.
     * The subscribers (the url generators) have registered for this event and the queue will call
     * all subscribers sequentially. The first generator, where the conditions match the resource, will
     * own the resource and it's url.
     *
     * @param {String} type (post,user...)
     * @param {Bookshelf-Model} model
     * @returns {Promise}
     * @private
     */
    _onResourceAdded(type, model) {
        debug('_onResourceAdded', type);

        const resourceConfig = _.find(this.resourcesConfig, {type: type});

        // NOTE: synchronous handling for post and pages so that their URL is available without a delay
        //       for more context and future improvements check https://github.com/TryGhost/Ghost/issues/10360
        if (['posts', 'pages'].includes(type)) {
            const obj = this._prepareModelSync(model, resourceConfig);

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
        } else {
            return Promise.resolve()
                .then(() => {
                    return this._fetchSingle(resourceConfig, model.id);
                })
                .then(([dbResource]) => {
                    if (dbResource) {
                        const resource = new Resource(type, dbResource);

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
                });
        }
    }

    /**
     * @description Listener for "model updated" event.
     *
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
     *
     * @param {String} type (post,user...)
     * @param {Bookshelf-Model} model
     * @returns {Promise}
     * @private
     */
    _onResourceUpdated(type, model) {
        debug('_onResourceUpdated', type);

        const resourceConfig = _.find(this.resourcesConfig, {type: type});

        // NOTE: synchronous handling for post and pages so that their URL is available without a delay
        //       for more context and future improvements check https://github.com/TryGhost/Ghost/issues/10360
        if (['posts', 'pages'].includes(type)) {
            // CASE: search for the target resource in the cache
            this.data[type].every((resource) => {
                if (resource.data.id === model.id) {
                    const obj = this._prepareModelSync(model, resourceConfig);

                    resource.update(obj);

                    // CASE: Resource is not owned, try to add it again (data has changed, it could be that somebody will own it now)
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
        } else {
            return Promise.resolve()
                .then(() => {
                    return this._fetchSingle(resourceConfig, model.id);
                })
                .then(([dbResource]) => {
                    const resource = this.data[type].find(resource => (resource.data.id === model.id));

                    // CASE: cached resource exists, API conditions matched with the data in the db
                    if (resource && dbResource) {
                        resource.update(dbResource);

                        // CASE: pretend it was added
                        if (!resource.isReserved()) {
                            this.queue.start({
                                event: 'added',
                                action: 'added:' + dbResource.id,
                                eventData: {
                                    id: dbResource.id,
                                    type: type
                                }
                            });
                        }
                    } else if (!resource && dbResource) {
                        this._onResourceAdded(type, model);
                    } else if (resource && !dbResource) {
                        this._onResourceRemoved(type, model);
                    }
                });
        }
    }

    /**
     * @description Listener for "model removed" event.
     * @param {String} type (post,user...)
     * @param {Bookshelf-Model} model
     * @private
     */
    _onResourceRemoved(type, model) {
        debug('_onResourceRemoved', type);

        let index = null;
        let resource;

        // CASE: search for the cached resource and stop if it was found
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

        // remove the resource from cache
        this.data[type].splice(index, 1);
        resource.remove();
    }

    /**
     * @description Get all cached resources.
     * @returns {Object}
     */
    getAll() {
        return this.data;
    }

    /**
     * @description Get all cached resourced by type.
     * @param {String} type (post, user...)
     * @returns {Object}
     */
    getAllByType(type) {
        return this.data[type];
    }

    /**
     * @description Get all cached resourced by resource id and type.
     * @param {String} type (post, user...)
     * @param {String} id
     * @returns {Object}
     */
    getByIdAndType(type, id) {
        return _.find(this.data[type], {data: {id: id}});
    }

    /**
     * @description Reset this class instance.
     *
     * Is triggered if you switch API versions.
     *
     * @param {Object} options
     */
    reset(options = {ignoreDBReady: false}) {
        _.each(this.listeners, (obj) => {
            if (obj.eventName === 'db.ready' && options.ignoreDBReady) {
                return;
            }

            events.removeListener(obj.eventName, obj.listener);
        });

        this.listeners = [];
        this.data = {};
        this.resourcesConfig = null;
    }

    /**
     * @description Soft reset this class instance. Only used for test env.
     *              It will only clear the cache.
     */
    softReset() {
        this.data = {};

        _.each(this.resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];
        });
    }

    /**
     * @description Release all resources. Get's called during "reset".
     */
    releaseAll() {
        _.each(this.data, (resources, type) => {
            _.each(this.data[type], (resource) => {
                resource.release();
            });
        });
    }
}

module.exports = Resources;
