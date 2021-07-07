const _ = require('lodash');
const debug = require('@tryghost/debug')('models:base:model-events');
const ObjectId = require('bson-objectid');

const schema = require('../../../data/schema');

// This wires up our model event system
const events = require('../../../lib/common/events');

module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        initializeEvents: function () {
            // NOTE: triggered before `creating`/`updating`
            this.on('saving', function onSaving(newObj, attrs, options) {
                if (options.method === 'insert') {
                // id = 0 is still a valid value for external usage
                    if (_.isUndefined(newObj.id) || _.isNull(newObj.id)) {
                        newObj.setId();
                    }
                }
            });

            this.on('fetched', this.onFetched);
            this.on('fetching', this.onFetching);
            this.on('fetched:collection', this.onFetchedCollection);
            this.on('fetching:collection', this.onFetchingCollection);
            this.on('creating', this.onCreating);
            this.on('created', this.onCreated);
            this.on('updating', this.onUpdating);
            this.on('updated', this.onUpdated);
            this.on('destroying', this.onDestroying);
            this.on('destroyed', this.onDestroyed);
            this.on('saving', this.onSaving);
            this.on('saved', this.onSaved);
        },

        /**
         * we auto generate a GUID for each resource
         * no auto increment
         */
        setId: function setId() {
            this.set('id', ObjectId().toHexString());
        },

        /**
         * @NOTE
         * We have to remember the `_previousAttributes` attributes, because when destroying resources
         * We listen on the `onDestroyed` event and Bookshelf resets these properties right after the event.
         * If the query runs in a txn, `_previousAttributes` will be empty.
         */
        emitChange: function (model, event, options) {
            const _emit = (ghostEvent, _model, opts) => {
                if (!_model.wasChanged()) {
                    return;
                }

                debug(_model.tableName, ghostEvent);

                // @NOTE: Internal Ghost events. These are very granular e.g. post.published
                events.emit(ghostEvent, _model, opts);
            };

            if (!options.transacting) {
                return _emit(event, model, options);
            }

            if (!model.ghostEvents) {
                model.ghostEvents = [];

                // CASE: when importing, deleting or migrating content, lot's of model queries are happening in one transaction
                //       lot's of model events will be triggered. we ensure we set the max listeners to infinity.
                //       we are using `once` - we auto remove the listener afterwards
                if (options.importing || options.destroyAll || options.migrating) {
                    options.transacting.setMaxListeners(0);
                }

                options.transacting.once('committed', (committed) => {
                    if (!committed) {
                        return;
                    }

                    _.each(this.ghostEvents, (obj) => {
                        _emit(obj.event, model, obj.options);
                    });

                    delete model.ghostEvents;
                });
            }

            model.ghostEvents.push({
                event: event,
                options: {
                    importing: options.importing,
                    context: options.context
                }
            });
        },

        /**
         * Do not call `toJSON`. This can remove properties e.g. password.
         * @returns {*}
         */
        onValidate: function onValidate(model, columns, options) {
            this.setEmptyValuesToNull();
            return schema.validate(this.tableName, this, options);
        },

        onFetched() {},

        /**
         * http://knexjs.org/#Builder-forUpdate
         * https://dev.mysql.com/doc/refman/5.7/en/innodb-locking-reads.html
         *
         * Lock target collection/model for further update operations.
         * This avoids collisions and possible content override cases.
         */
        onFetching: function onFetching(model, columns, options) {
            if (options.forUpdate && options.transacting) {
                options.query.forUpdate();
            }
        },

        onFetchedCollection() {},

        onFetchingCollection: function onFetchingCollection(model, columns, options) {
            if (options.forUpdate && options.transacting) {
                options.query.forUpdate();
            }
        },

        onCreated(model, attrs, options) {
            this.addAction(model, 'added', options);
        },

        /**
         * Adding resources implies setting these properties on the server side
         * - set `created_by` based on the context
         * - set `updated_by` based on the context
         * - the bookshelf `timestamps` plugin sets `created_at` and `updated_at`
         *   - if plugin is disabled (e.g. import) we have a fallback condition
         *
         * Exceptions: internal context or importing
         */
        onCreating: function onCreating(model, attr, options) {
            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_by')) {
                if (!options.importing || (options.importing && !this.get('created_by'))) {
                    this.set('created_by', String(this.contextUser(options)));
                }
            }

            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_by')) {
                if (!options.importing) {
                    this.set('updated_by', String(this.contextUser(options)));
                }
            }

            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_at')) {
                if (!model.get('created_at')) {
                    model.set('created_at', new Date());
                }
            }

            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_at')) {
                if (!model.get('updated_at')) {
                    model.set('updated_at', new Date());
                }
            }

            return Promise.resolve(this.onValidate(model, attr, options))
                .then(() => {
                    /**
                     * @NOTE:
                     *
                     * The API requires only specific attributes to send. If we don't set the rest explicitly to null,
                     * we end up in a situation that on "created" events the field set is incomplete, which is super confusing
                     * and hard to work with if you trigger internal events, which rely on full field set. This ensures consistency.
                     *
                     * @NOTE:
                     *
                     * Happens after validation to ensure we don't set fields which are not nullable on db level.
                     */
                    _.each(Object.keys(schema.tables[this.tableName]).filter(key => key.indexOf('@@') === -1), (columnKey) => {
                        if (model.get(columnKey) === undefined) {
                            model.set(columnKey, null);
                        }
                    });

                    model._changed = _.cloneDeep(model.changed);
                });
        },

        onUpdated(model, attrs, options) {
            this.addAction(model, 'edited', options);
        },

        /**
         * Changing resources implies setting these properties on the server side
         * - set `updated_by` based on the context
         * - ensure `created_at` never changes
         * - ensure `created_by` never changes
         * - the bookshelf `timestamps` plugin sets `updated_at` automatically
         *
         * Exceptions:
         *   - importing data
         *   - internal context
         *   - if no context
         *
         * @deprecated: x_by fields (https://github.com/TryGhost/Ghost/issues/10286)
         */
        onUpdating: function onUpdating(model, attr, options) {
            if (this.relationships) {
                model.changed = _.omit(model.changed, this.relationships);
            }

            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_by')) {
                if (!options.importing && !options.migrating) {
                    this.set('updated_by', String(this.contextUser(options)));
                }
            }

            if (options && options.context && !options.context.internal && !options.importing) {
                if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_at')) {
                    if (model.hasDateChanged('created_at', {beforeWrite: true})) {
                        model.set('created_at', this.previous('created_at'));
                    }
                }

                if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'created_by')) {
                    if (model.hasChanged('created_by')) {
                        model.set('created_by', String(this.previous('created_by')));
                    }
                }
            }

            // CASE: do not allow setting only the `updated_at` field, exception: importing
            if (Object.prototype.hasOwnProperty.call(schema.tables[this.tableName], 'updated_at') && !options.importing) {
                if (options.migrating) {
                    model.set('updated_at', model.previous('updated_at'));
                } else if (Object.keys(model.changed).length === 1 && model.changed.updated_at) {
                    model.set('updated_at', model.previous('updated_at'));
                    delete model.changed.updated_at;
                }
            }

            model._changed = _.cloneDeep(model.changed);

            return Promise.resolve(this.onValidate(model, attr, options));
        },

        onSaved() {},

        onSaving: function onSaving() {
            // Remove any properties which don't belong on the model
            this.attributes = this.pick(this.permittedAttributes());
        },

        onDestroying() {},

        onDestroyed(model, options) {
            if (!model._changed) {
                model._changed = {};
            }

            // @NOTE: Bookshelf destroys ".changed" right after this event, but we should not throw away the information
            //        It is useful for webhooks, events etc.
            // @NOTE: Bookshelf returns ".changed = {empty...}" on destroying (https://github.com/bookshelf/bookshelf/issues/1943)
            Object.assign(model._changed, _.cloneDeep(model.changed));

            this.addAction(model, 'deleted', options);
        }
    });
};
