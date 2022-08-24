const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
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

            let context = {};

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
         * We could embedd adding actions more nicely in the future e.g. plugin.
         */
        addAction: (model, event, options) => {
            if (!model.wasChanged()) {
                return;
            }

            // CASE: model does not support actions at all
            if (!model.getAction) {
                return;
            }

            const existingAction = model.getAction(event, options);

            // CASE: model does not support action for target event
            if (!existingAction) {
                return;
            }

            const insert = (action) => {
                Bookshelf.model('Action')
                    .add(action)
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

                    insert(existingAction);
                });
            } else {
                insert(existingAction);
            }
        }
    });
};
