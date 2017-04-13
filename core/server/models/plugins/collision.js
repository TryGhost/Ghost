var moment = require('moment-timezone'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    errors = require('../../errors');

module.exports = function (Bookshelf) {
    var ParentModel = Bookshelf.Model,
        Model;

    Model = Bookshelf.Model.extend({
        /**
         * Collision protection.
         *
         * NOTE: The `sync` method is called for any query e.g. update, add, delete, fetch
         *
         * NOTE: We had the option to override Bookshelf's `save` method, but hooking into the `sync` method gives us
         *       the ability to access the `changed` object. Bookshelf already knows which attributes has changed.
         *
         * NOTE: Bookshelf's timestamp function can't be overridden, as it's synchronous, there is no way to return an Error.
         *
         */
        sync: function timestamp(options) {
            var parentSync = ParentModel.prototype.sync.apply(this, arguments),
                originalUpdateSync = parentSync.update,
                self = this, err;

            if (this.tableName !== 'posts' ||
                !self.serverData ||
                ((options.method !== 'update' && options.method !== 'patch') || !options.method)
            ) {
                return parentSync;
            }

            /**
             * Only hook into the update sync
             *
             * IMPORTANT NOTES:
             * Even if the client sends a different `id` property, it get's ignored by bookshelf.
             * Because you can't change the `id` of an existing post.
             *
             * HTML is always auto generated, ignore.
             * @TODO: how to detect TAGS?
             */
            parentSync.update = function update(attrs) {
                var changed = _.omit(self.changed, [
                        'created_at', 'updated_at', 'author_id', 'id', 'tags',
                        'published_by', 'updated_by', 'html'
                    ]),
                    clientUpdatedAt = moment(self.clientData.updated_at || self.serverData.updated_at),
                    serverUpdatedAt = moment(self.serverData.updated_at);

                if (Object.keys(changed).length) {
                    if (clientUpdatedAt.diff(serverUpdatedAt) !== 0) {
                        err = new errors.InternalServerError('Uh-oh. We already have a newer version of this post saved.' +
                            'To prevent losing your text, please copy your changes somewhere else and then refresh this page.');
                        err.code = 'UPDATE_COLLISION';
                        return Promise.reject(err);
                    }
                }

                return originalUpdateSync.apply(this, arguments);
            };

            return parentSync;
        },


        /**
         * We have to remember current server data and client data.
         * The `sync` method has no access to it.
         * `updated_at` is already set to "Date.now" when sync.update is called.
         */
        save: function save(data, options) {
            this.clientData = _.cloneDeep(data) || {};
            this.serverData = _.cloneDeep(this.attributes);

            return ParentModel.prototype.save.apply(this, arguments);
        }
    });

    Bookshelf.Model = Model;
};
