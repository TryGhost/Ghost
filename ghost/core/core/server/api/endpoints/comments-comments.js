const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const db = require('../../data/db');
const ALLOWED_INCLUDES = ['post', 'member', 'likes', 'replies'];
const UNSAFE_ATTRS = ['status'];

const messages = {
    commentNotFound: 'Comment could not be found',
    memberNotFound: 'Unable to find member',
    likeNotFound: 'Unable to find like',
    alreadyLiked: 'This comment was liked already'
};

module.exports = {
    docName: 'comments',

    browse: {
        options: [
            'include',
            'page',
            'limit',
            'fields',
            'filter',
            'order',
            'debug'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return models.Comment.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include'
        ],
        data: [
            'id',
            'email'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return models.Comment.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.commentNotFound)
                        }));
                    }

                    return model;
                });
        }
    },

    edit: {
        headers: {},
        options: [
            'id',
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Comment.edit(frame.data.comments[0], frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.commentNotFound)
                        }));
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        options: [
            'include'

        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            },
            data: {
                post_id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            // TODO: move to comment service
            const data = frame.data.comments[0];

            if (frame.options?.context?.member?.id) {
                data.member_id = frame.options.context.member.id;

                // todo: add validation that the parent comment is on the same post, and not deleted
                return models.Comment.add(data, frame.options);
            } else {
                return Promise.reject(new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                }));
            }
        }
    },

    destroy: {
        statusCode: 204,
        options: [
            'include',
            'id'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            frame.options.require = true;

            return models.Comment.destroy(frame.options)
                .then(() => null)
                .catch(models.Comment.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.commentNotFound)
                    }));
                });
        }
    },

    counts: {
        permissions: false,
        async query(frame) {
            const query = db.knex('comments')
                .select(db.knex.raw(`COUNT(*) AS count, post_id`))
                .groupBy('post_id');

            if (Array.isArray(frame?.data?.ids)) {
                query.whereIn('post_id', frame.data.ids);
            }

            const results = await query;

            const counts = {};

            for (const row of results) {
                counts[row.post_id] = row.count;
            }

            return counts;
        }
    },

    like: {
        statusCode: 204,
        options: [
            'id'
        ],
        validation: {
        },
        permissions: true,
        async query(frame) {
            // TODO: move to likes service
            if (frame.options?.context?.member?.id) {
                const data = {
                    member_id: frame.options.context.member.id,
                    comment_id: frame.options.id
                };

                const existing = await models.CommentLike.findOne(data, frame.options);

                if (existing) {
                    throw new errors.BadRequestError({
                        message: tpl(messages.alreadyLiked)
                    });
                }

                return await models.CommentLike.add(data, frame.options);
            } else {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }
        }
    },

    unlike: {
        statusCode: 204,
        options: [
            'id'
        ],
        validation: {},
        permissions: true,
        query(frame) {
            frame.options.require = true;

            // TODO: move to likes service
            if (frame.options?.context?.member?.id) {
                return models.CommentLike.destroy({
                    ...frame.options,
                    destroyBy: {
                        member_id: frame.options.context.member.id,
                        comment_id: frame.options.id
                    }
                }).then(() => null)
                    .catch(models.CommentLike.NotFoundError, () => {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.likeNotFound)
                        }));
                    });
            } else {
                return Promise.reject(new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                }));
            }
        }
    }
};
