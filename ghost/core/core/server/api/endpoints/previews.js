const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['authors', 'tags'];
const ALLOWED_MEMBER_STATUSES = ['anonymous', 'free', 'paid'];

const messages = {
    postNotFound: 'Post not found.'
};

// Simulate serving content as different member states by setting the minimal
// member context needed for content gating to function
const _addMemberContextToFrame = (frame) => {
    if (!frame?.options?.memberStatus) {
        return;
    }

    // only set apiType when given a memberStatus to preserve backwards compatibility
    // where we used to serve "Admin API" content with no gating for all previews
    frame.apiType = 'content';

    frame.original ??= {};
    frame.original.context ??= {};

    if (frame.options?.memberStatus === 'free') {
        frame.original.context.member = {
            status: 'free'
        };
    }

    if (frame.options?.memberStatus === 'paid') {
        frame.original.context.member = {
            status: 'paid'
        };
    }
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'previews',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: [
            'include',
            'memberStatus'
        ],
        data: [
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                memberStatus: {
                    values: ALLOWED_MEMBER_STATUSES
                }
            },
            data: {
                uuid: {
                    required: true
                }
            }
        },
        query(frame) {
            _addMemberContextToFrame(frame);

            return models.Post.findOne(Object.assign({status: 'all'}, frame.data), frame.options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: tpl(messages.postNotFound)
                        });
                    }

                    return model;
                });
        }
    }
};

module.exports = controller;
