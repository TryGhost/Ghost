const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

/**
 * This plugin is used to add actions to the database. It backs the "audit log" feature we have in Ghost.
 *
 * The functions here are triggered by the `onCreated`, `onUpdated`, `onDeleted` functions in the `events`
 * plugin, with some extra ones for niche other events.
 *
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    /**
     * Insert an action into the database
     *
     * @param {Object} data - The data to insert
     * @param {Object} options - The options object
     */
    const insertAction = (data, options) => {
        // CASE: model does not support action for target event
        if (!data) {
            return;
        }

        const insert = (action) => {
            Bookshelf.model('Action')
                .add(action, {autoRefresh: false})
                .catch((err) => {
                    if (_.isArray(err)) {
                        err = err[0];
                    }

                    logging.error(new errors.InternalServerError({
                        err
                    }));
                });
        };

        if (options.transacting) {
            options.transacting.once('committed', (committed) => {
                if (!committed) {
                    return;
                }

                insert(data);
            });
        } else {
            insert(data);
        }
    };

    /**
     * Add an action to the database
     *
     * @param {import('bookshelf').Model} model - The model to add the action to
     * @param {string} event - The event that triggered the action
     * @param {Object} options - The options object
     */
    const addAction = (model, event, options) => {
        if (!model.wasChanged()) {
            return;
        }

        // CASE: model does not support actions at all
        if (!model.getAction) {
            return;
        }

        const data = model.getAction(event, options);
        insertAction(data, options);
    };

    Bookshelf.Model = Bookshelf.Model.extend({
        /**
         * Constructs data to be stored in the database with info
         * on particular actions
         *
         * @param {string} event - The event that triggered the action
         * @param {Object} options - The options object
         * @returns {Object} The data to be stored in the database
         */
        getAction(event, options) {
            // Ignore internal updates (`options.context.internal`) for now
            const actor = this.getActor(options);
            if (!actor) {
                return;
            }

            if (!this.actionsCollectCRUD) {
                return;
            }

            const resourceType = this.actionsResourceType;
            if (!resourceType) {
                return;
            }

            let context = {
                action_name: options.actionName
            };

            // Used to attach extra content to the action (ie. the key + group for settings changes)
            if (this.actionsExtraContext && Array.isArray(this.actionsExtraContext)) {
                for (const c of this.actionsExtraContext) {
                    context[c] = this.get(c) || this.previous(c);
                }
            }

            // Attach the primary name to the action (ie. the title or name of the model)
            if (event === 'deleted') {
                context.primary_name = (this.previous('title') || this.previous('name'));
            } else if (['added', 'edited'].includes(event)) {
                context.primary_name = (this.get('title') || this.get('name') || this.previous('title') || this.previous('name'));
            }

            const data = {
                event,
                resource_id: this.id || this.previous('id'),
                resource_type: resourceType,
                actor_id: actor.id,
                actor_type: actor.type
            };

            if (context && Object.keys(context).length) {
                data.context = context;
            }

            return data;
        },

        addAction
    }, {
        addAction,

        /**
         * Add actions for bulk actions
         *
         * @param {string} event - The event that triggered the action
         * @param {number[]} ids - The ids of the models that were affected
         * @param {Object} options - The options object
         */
        async addActions(event, ids, options) {
            if (ids.length === 1) {
                // We want to store an event for a single model in the actions table
                // This is so we can include the name
                const model = await this.findOne({[options.column ?? 'id']: ids[0]}, {require: true, transacting: options.transacting, context: {internal: true}});
                this.addAction(model, event, options);
                return;
            }

            const existingAction = this.getBulkAction(event, ids.length, options);
            insertAction(existingAction, options);
        },

        /**
         * Constructs data for bulk actions to be stored in the database
         *
         * @param {string} event - The event that triggered the action
         * @param {number} count - The number of models that were affected
         * @param {Object} options - The options object
         * @returns {Object} The data to be stored in the database
         */
        getBulkAction(event, count, options) {
            // Ignore internal updates (`options.context.internal`) for now
            const actor = this.prototype.getActor(options);
            if (!actor) {
                return;
            }

            // Models can opt-in to their CRUD actions being collected (we do this so we don't
            // log every single action)
            if (!this.prototype.actionsCollectCRUD) {
                return;
            }

            const resourceType = this.prototype.actionsResourceType;
            if (!resourceType) {
                return;
            }

            let context = {
                count,
                action_name: options.actionName
            };

            if (this.getBulkActionExtraContext && typeof this.getBulkActionExtraContext === 'function') {
                context = {
                    ...context,
                    ...this.getBulkActionExtraContext.bind(this)(options)
                };
            }

            const data = {
                event,
                resource_id: null,
                resource_type: resourceType,
                actor_id: actor.id,
                actor_type: actor.type
            };

            if (context && Object.keys(context).length) {
                data.context = context;
            }

            return data;
        }
    });
};
