const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('services:url:resources');
const Resource = require('./Resource');
const config = require('../../config');
const models = require('../../models');
const common = require('../../lib/common');

/**
 * At the moment Resource service is directly responsible for data population
 * for URLs in UrlService. But because it's actually a storage of all possible
 * resources in the system, could also be used as a cache for Content API in
 * the future.
 */
class Resources {
    constructor(queue) {
        this.queue = queue;
        this.resourcesConfig = [];
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
        this._listenOn('db.ready', this.fetchResources.bind(this));
    }

    _initResourceConfig() {
        if (!_.isEmpty(this.resourcesConfig)) {
            return this.resourceConfig;
        }

        this.resourcesAPIVersion = require('../themes').getApiVersion();
        this.resourcesConfig = require(`./configs/${this.resourcesAPIVersion}`);
    }

    fetchResources() {
        const ops = [];
        debug('db ready. settings cache ready.');
        this._initResourceConfig();

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

    _fetchSingle(resourceConfig, id) {
        let modelOptions = _.cloneDeep(resourceConfig.modelOptions);
        modelOptions.id = id;

        return models.Base.Model.raw_knex.fetchAll(modelOptions);
    }

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

        const resourceConfig = _.find(this.resourcesConfig, {type: type});

        // NOTE: synchronous handling for post and pages so that their URL is available without a delay
        //       for more context and future improvements check https://github.com/TryGhost/Ghost/issues/10360
        if (['posts', 'pages'].includes(type)) {
            this.data[type].every((resource) => {
                if (resource.data.id === model.id) {
                    const obj = this._prepareModelSync(model, resourceConfig);

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
        } else {
            return Promise.resolve()
                .then(() => {
                    return this._fetchSingle(resourceConfig, model.id);
                })
                .then(([dbResource]) => {
                    const resource = this.data[type].find(resource => (resource.data.id === model.id));

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

    _onResourceRemoved(type, model) {
        debug('_onResourceRemoved', type);

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

    reset(options = {ignoreDBReady: false}) {
        _.each(this.listeners, (obj) => {
            if (obj.eventName === 'db.ready' && options.ignoreDBReady) {
                return;
            }

            common.events.removeListener(obj.eventName, obj.listener);
        });

        this.listeners = [];
        this.data = {};
        this.resourcesConfig = null;
    }

    softReset() {
        this.data = {};

        _.each(this.resourcesConfig, (resourceConfig) => {
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
