const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    missingContext: 'missing context'
};

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        getActor(options = {context: {}}) {
            if (options.context && options.context.integration) {
                return {
                    id: options.context.integration.id,
                    type: 'integration'
                };
            }

            if (options.context && options.context.user) {
                return {
                    id: options.context.user,
                    type: 'user'
                };
            }

            return null;
        },

        // Get the user from the options object
        contextUser: function contextUser(options) {
            options = options || {};
            options.context = options.context || {};

            if (options.context.user) {
                return options.context.user;
            } else if (options.context.integration) {
            /**
             * @NOTE:
             *
             * This is a dirty fix until we get rid of all the x_by columns
             * @deprecated x_by columns are deprecated as of v1.0 - instead we should use the actions table
             * see https://github.com/TryGhost/Ghost/issues/10286.
             *
             * We return the owner ID '1' in case an integration updates or creates resources.
             *
             * ---
             *
             * Why using ID '1'? WAIT. What???????
             *
             * See https://github.com/TryGhost/Ghost/issues/9299.
             *
             * We currently don't read the correct owner ID from the database and assume it's '1'.
             * This is a leftover from switching from auto increment ID's to Object ID's.
             * But this takes too long to refactor out now. If an internal update happens, we also
             * use ID '1'. This logic exists for a LONG while now. The owner ID only changes from '1' to something else,
             * if you transfer ownership.
             */
                return Bookshelf.Model.internalUser;
            } else if (options.context.internal) {
                return Bookshelf.Model.internalUser;
            } else if (this.get('id')) {
                return this.get('id');
            } else {
                throw new errors.NotFoundError({
                    message: tpl(messages.missingContext),
                    level: 'critical'
                });
            }
        }
    }, {
        /**
         * please use these static definitions when comparing id's
         * we keep type Number, because we have too many check's where we rely on Number
         * context.user ? true : false (if context.user is 0 as number, this condition is false)
         */
        internalUser: 1,

        isInternalUser: function isInternalUser(id) {
            return id === Bookshelf.Model.internalUser || id === Bookshelf.Model.internalUser.toString();
        }
    });
};
