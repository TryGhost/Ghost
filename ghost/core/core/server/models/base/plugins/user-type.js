const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    missingContext: 'missing context'
};

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf, pluginOptions) {
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
        contextUser: async function contextUser(options) {
            options = options || {};
            options.context = options.context || {};

            if (options.context.user) {
                return options.context.user;
            } else if (options.context.integration) {
                return pluginOptions.resolveIntegrationUserId({
                    transacting: options.transacting
                });
            } else if (options.context.internal) {
                return pluginOptions.resolveInternalUserId({
                    transacting: options.transacting
                });
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
