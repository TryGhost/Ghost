var _ = require('lodash'),
    validator = require('validator'),
    api = require('../../../api'),
    errors = require('../../../errors'),
    logging = require('../../../logging'),
    models = require('../../../models'),
    utils = require('../../../utils'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function UserMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(UserMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(UserMapGenerator.prototype, {
    bindEvents: function () {
        var self = this,
            addOrRemoveAuthorUrl = function fetchAuthor(authorId) {
                return models.User
                    .findOne({id: authorId}, {status: 'all', include: 'count.posts', context: {public: true}})
                    .then(function (authorModelWithPostsCount) {
                        if (!authorModelWithPostsCount) {
                            throw new errors.NotFoundError({
                                message: 'Sitemap: UserGenerator could not found author',
                                context: authorId
                            });
                        }

                        return authorModelWithPostsCount;
                    })
                    .then(function (authorModelWithPostsCount) {
                        if (authorModelWithPostsCount.get('count__posts') === 0) {
                            self.removeUrl(authorModelWithPostsCount);
                        } else {
                            self.addOrUpdateUrl(authorModelWithPostsCount);
                        }
                    })
                    .catch(function (err) {
                        logging.error(err);
                    });
            };

        /**
         * Definitely remove url if user is deactivated (e.g. suspended).
         * No need to fetch the author.
         */
        this.dataEvents.on('user.deactivated', function (model) {
            self.removeUrl(model);
        });

        /**
         * We have to listen for the activated user event, because if a user get's deactivated and
         * has > 0 posts connected and get's activated again, we have to take care of this case.
         */
        this.dataEvents.on('user.activated', function (model) {
            addOrRemoveAuthorUrl(model.id);
        });

        /**
         * Only care about the edit event, if specific fields changed.
         * Otherwise:
         *   - e.g. if a user get's activated, another `user.edited` event is triggered
         *   - we only care about specific things here
         *
         * Edit event helps to keep the author url up-to-date.
         */
        this.dataEvents.on('user.edited', function (model) {
            var slugChanged = model.get('slug') !== model.updated('slug');

            if (slugChanged) {
                addOrRemoveAuthorUrl(model.id);
            }
        });

        /**
         * If a post get's deleted or the whole content get's deleted, we have to check if
         * the author has minimum one post connected. We have to use `previous`, because if a post get's deleted,
         * the current properties are nulled.
         */
        this.dataEvents.on('post.deleted', function (model) {
            addOrRemoveAuthorUrl(model.previous('author_id'));
        });

        /**
         * We check if an author is still connected to minimum 1 post.
         * We have to fetch the related author object.
         */
        this.dataEvents.onMany(['post.published', 'post.unpublished'], function (model) {
            addOrRemoveAuthorUrl(model.get('author_id'));
        });
    },

    getData: function () {
        return api.users.browse({
            context: {
                public: true
            },
            filter: 'visibility:public',
            status: 'active',
            limit: 'all',
            include: 'count.posts'
        }).then(function (resp) {
            return _.filter(resp.users, function (user) {
                return user.count.posts > 0;
            });
        });
    },

    validateDatum: function (datum) {
        return datum.visibility === 'public' && _.includes(models.User.activeStates, datum.status);
    },

    getUrlForDatum: function (user) {
        return utils.url.urlFor('author', {author: user}, true);
    },

    getPriorityForDatum: function () {
        // TODO: We could influence this with meta information
        return 0.6;
    },

    validateImageUrl: function (imageUrl) {
        return imageUrl && validator.isURL(imageUrl, {protocols: ['http', 'https'], require_protocol: true});
    }
});

module.exports = UserMapGenerator;
