var moment = require('moment-timezone'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    errors = require('../../errors');

module.exports = function (Bookshelf) {
    var ParentModel = Bookshelf.Model,
        Model;

    Model = Bookshelf.Model.extend({
        /**
         * Update collision protection.
         *
         * IMPORTANT NOTES:
         * The `sync` method is called for any query e.g. update, add, delete, fetch
         *
         * We had the option to override Bookshelf's `save` method, but hooking into the `sync` method gives us
         * the ability to access the `changed` object. Bookshelf already knows which attributes has changed.
         *
         * Bookshelf's timestamp function can't be overridden, as it's synchronous, there is no way to return an Error.
         *
         * If we want to enable the collision plugin for other tables, the queries might need to run in a transaction.
         * This depends on if we fetch the model before editing. Imagine two concurrent requests come in, both would fetch
         * the same current database values and both would succeed to update and override each other.
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
             */
            parentSync.update = function update() {
                var changed = _.omit(self.changed, [
                        'created_at', 'updated_at', 'author_id', 'id',
                        'published_by', 'updated_by', 'html'
                    ]),
                    clientUpdatedAt = moment(self.clientData.updated_at || self.serverData.updated_at),
                    serverUpdatedAt = moment(self.serverData.updated_at);

                if (Object.keys(changed).length) {
                    if (clientUpdatedAt.diff(serverUpdatedAt) !== 0) {
                        err = new errors.InternalServerError('Saving failed! Someone else is editing this post.');
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
        save: function save(data) {
            this.clientData = _.cloneDeep(data) || {};
            this.serverData = _.cloneDeep(this.attributes);

            return ParentModel.prototype.save.apply(this, arguments);
        }
    });

    Bookshelf.Model = Model;
};
