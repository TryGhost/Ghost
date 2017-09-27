// # Access Rules
//
// Extends Bookshelf.Model.forge to take a 'context' option which provides information on how this query should
// be treated in terms of data access rules - currently just detecting public requests
module.exports = function (Bookshelf) {
    var model = Bookshelf.Model,
        Model;

    Model = Bookshelf.Model.extend({
        /**
         * Cached copy of the context setup for this model instance
         */
        _context: null,

        /**
         * A model method/helper to determine if this is a public request or not.
         * @returns {boolean}
         */
        isPublicContext: function isPublicContext(options) {
            if (options) {
                return Model.isPublicContext(options);
            }

            return !!(this._context && this._context.public);
        },

        isInternalContext: function isInternalContext() {
            return !!(this._context && this._context.internal);
        }
    },
    {
        /**
         * A static method to determine if this is a public request or not.
         * @returns {boolean}
         */
        isPublicContext: function isPublicContext(options) {
            if (options && options.context && options.context.public) {
                return true;
            }

            return false;
        },

        /**
         * ## Forge
         * Ensure that context gets set as part of the forge
         *
         * @TODO: We almost never use `.forge(options)` - reconsider.
         *
         * @param {object} attributes
         * @param {object} options
         * @returns {Bookshelf.Model} model
         */
        forge: function forge(attributes, options) {
            var self = model.forge.apply(this, arguments);

            if (options && options.context) {
                self._context = options.context;
                delete options.context;
            }

            return self;
        }
    });

    Bookshelf.Model = Model;
};
