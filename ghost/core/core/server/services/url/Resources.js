const _ = require('lodash');
const debug = require('@tryghost/debug')('services:url:resources');
const DomainEvents = require('@tryghost/domain-events');
const {URLResourceUpdatedEvent} = require('@tryghost/dynamic-routing-events');
const Resource = require('./Resource');
const config = require('../../../shared/config');
const models = require('../../models');

// This listens to all manner of model events to find new content that needs a URL...
const events = require('../../lib/common/events');

/**
 * @description At the moment the resources class is directly responsible for data population
 * for URLs...but because it's actually a storage cache of all published
 * resources in the system, could also be used as a cache for Content API in
 * the future.
 *
 * Each entry in the database will be represented by a "Resource" (see /Resource.js).
 */
class Resources {
    /**
     *
     * @param {Object} options
     * @param {Object} [options.resources] - resources to initialize with instead of fetching them from the database
     * @param {Object} [options.queue] - instance of the Queue class
     * @param {Object[]} [options.resourcesConfig] - resource config used when handling resource events and fetching
     */
    constructor({resources = {}, queue, resourcesConfig = []} = {}) {
        this.queue = queue;
        this.resourcesConfig = resourcesConfig;
        this.data = resources;

        this.listeners = [];
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
     * @description Helper function to initialize data fetching.
     */
    async fetchResources() {
        const ops = [];
        debug('fetchResources');

        // NOTE: Iterate over all resource types (posts, users etc..) and call `_fetch`.
        _.each(this.resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];

            // NOTE: We are querying knex directly, because the Bookshelf ORM overhead is too slow.
            ops.push(this._fetch(resourceConfig));
        });

        await Promise.all(ops);
    }

    /**
     * @description Each resource type needs to register resource/model events to get notified
     * about updates/deletions/inserts.
     *
     * For example for a "tag" resource type with following configuration:
     *  events: {
     *     add: 'tag.added',
     *     update: ['tag.edited', 'tag.attached', 'tag.detached'],
     *     remove: 'tag.deleted'
     *  }
     * there would be:
     * 1 event listener connected to  "_onResourceAdded"   handler and it's 'tag.added' event
     * 3 event listeners connected to "_onResourceUpdated" handler and it's 'tag.edited', 'tag.attached', 'tag.detached' events
     * 1 event listener connected to  "_onResourceRemoved" handler and it's 'tag.deleted' event
     */
    initEventListeners() {
        _.each(this.resourcesConfig, (resourceConfig) => {
            this.data[resourceConfig.type] = [];

            this._listenOn(resourceConfig.events.add, async (model) => {
                await this._onResourceAdded(resourceConfig.type, model);
            });

            if (_.isArray(resourceConfig.events.update)) {
                resourceConfig.events.update.forEach((event) => {
                    this._listenOn(event, async (model) => {
                        await this._onResourceUpdated(resourceConfig.type, model);
                    });
                });
            } else {
                this._listenOn(resourceConfig.events.update, async (model) => {
                    await this._onResourceUpdated(resourceConfig.type, model);
                });
            }

            this._listenOn(resourceConfig.events.remove, (model) => {
                this._onResourceRemoved(resourceConfig.type, model);
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
    async _fetch(resourceConfig, options = {offset: 0, limit: 999}) {
        debug('_fetch', resourceConfig.type, resourceConfig.modelOptions);

        let modelOptions = _.cloneDeep(resourceConfig.modelOptions);
        const isSQLite = config.get('database:client') === 'sqlite3';

        // CASE: prevent "too many SQL variables" error on SQLite3 (https://github.com/TryGhost/Ghost/issues/5810)
        if (isSQLite) {
            modelOptions.offset = options.offset;
            modelOptions.limit = options.limit;
        }

        const objects = await models.Base.Model.raw_knex.fetchAll(modelOptions);
        debug('fetched', resourceConfig.type, objects.length);

        _.each(objects, (object) => {
            this.data[resourceConfig.type].push(new Resource(resourceConfig.type, object));
        });

        if (objects.length && isSQLite) {
            options.offset = options.offset + options.limit;
            return this._fetch(resourceConfig, {offset: options.offset, limit: options.limit});
        }

        return objects;
    }

    /**
     * @description Call the model layer to fetch a single resource via raw knex queries.
     *
     * This function was invented, because the model event is a generic event, which is independent of any
     * api version behavior. We have to ensure that a model matches the conditions of the configured api version
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
     * @private
     */
    async _onResourceAdded(type, model) {
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
            const [dbResource] = await this._fetchSingle(resourceConfig, model.id);

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
        }
    }

    /**
     *
     * @param {Object} model resource model
     * @returns
     */
    _containsRoutingAffectingChanges(model, ignoredProperties) {
        if (model._changed && Object.keys(model._changed).length) {
            return _.difference(Object.keys(model._changed), ignoredProperties).length !== 0;
        }

        // NOTE: returning true here as "_changed" property might not be available on attached/detached events
        //       assuming there were route affecting changes by default
        return true;
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
     * @private
     */
    async _onResourceUpdated(type, model) {
        debug('_onResourceUpdated', type);

        const resourceConfig = _.find(this.resourcesConfig, {type: type});

        // NOTE: check if any of the route-related fields were changed and only proceed if so
        const ignoredProperties = [...resourceConfig.modelOptions.exclude, 'updated_at'];
        if (!this._containsRoutingAffectingChanges(model, ignoredProperties)) {
            const cachedResource = this.getByIdAndType(type, model.id);

            if (cachedResource && model._changed && Object.keys(model._changed).includes('updated_at')) {
                DomainEvents.dispatch(URLResourceUpdatedEvent.create(Object.assign(cachedResource.data, {
                    resourceType: cachedResource.config.type,
                    updated_at: model._changed.updated_at
                })));
            }

            debug('skipping _onResourceUpdated because only non-route-related properties changed');
            return false;
        }

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
            const [dbResource] = await this._fetchSingle(resourceConfig, model.id);

            const resource = this.data[type].find(r => (r.data.id === model.id));

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
                await this._onResourceAdded(type, model);
            } else if (resource && !dbResource) {
                await this._onResourceRemoved(type, model);
            }
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
     */
    reset() {
        _.each(this.listeners, (obj) => {
            events.removeListener(obj.eventName, obj.listener);
        });

        this.listeners = [];
        this.data = {};
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
