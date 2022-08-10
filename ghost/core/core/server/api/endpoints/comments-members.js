const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const commentsService = require('../../services/comments');
const ALLOWED_INCLUDES = ['member', 'replies', 'replies.member', 'replies.count.likes', 'replies.liked', 'count.replies', 'count.likes', 'liked', 'post', 'parent'];
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
            return commentsService.controller.browse(frame);
        }
    },

    replies: {
        options: [
            'include',
            'page',
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'id'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: 'browse',
        query(frame) {
            return commentsService.controller.replies(frame);
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
            return commentsService.controller.read(frame);
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
            return commentsService.controller.edit(frame);
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
            return commentsService.controller.add(frame);
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
            return commentsService.controller.destroy(frame);
        }
    },

    counts: {
        permissions: false,
        async query(frame) {
            return commentsService.controller.count(frame);
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
    },

    report: {
        statusCode: 204,
        options: [
            'id'
        ],
        validation: {},
        permissions: true,
        async query(frame) {
            if (!frame.options?.context?.member?.id) {
                return Promise.reject(new errors.UnauthorizedError({
                    message: tpl(messages.memberNotFound)
                }));
            }

            await commentsService.api.reportComment(frame.options.id, frame.options?.context?.member);
        }
    }
};
