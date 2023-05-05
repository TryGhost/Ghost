const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
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

    // We need this addAction accessible from the static model and instances
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
         */
        getAction(event, options) {
            const actor = this.getActor(options);

            // @NOTE: we ignore internal updates (`options.context.internal`) for now
            if (!actor) {
                return;
            }

            if (!this.actionsCollectCRUD) {
                return;
            }

            let resourceType = this.actionsResourceType;

            if (typeof resourceType === 'function') {
                resourceType = resourceType.bind(this)();
            }

            if (!resourceType) {
                return;
            }

            let context = {
                action_name: options.actionName
            };

            if (this.actionsExtraContext && Array.isArray(this.actionsExtraContext)) {
                for (const c of this.actionsExtraContext) {
                    context[c] = this.get(c) || this.previous(c);
                }
            }

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

        /**
         * @NOTE:
         *
         * We add actions step by step and define how they should look like.
         * Each post update triggers a couple of events, which we don't want to add actions for.
         *
         * e.g. transform post to page triggers a handful of events including `post.deleted` and `page.added`
         *
         * We protect adding too many and uncontrolled events.
         *
         * We could embed adding actions more nicely in the future e.g. plugin.
         */
        addAction
    }, {
        addAction,
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
         * Constructs data to be stored in the database with info
         * on particular actions
         */
        getBulkAction(event, count, options) {
            const actor = this.prototype.getActor(options);

            // @NOTE: we ignore internal updates (`options.context.internal`) for now
            if (!actor) {
                return;
            }

            if (!this.prototype.actionsCollectCRUD) {
                return;
            }

            let resourceType = this.prototype.actionsResourceType;

            if (typeof resourceType === 'function') {
                resourceType = resourceType.bind(this)();
            }

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
