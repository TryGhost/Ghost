const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const logging = require('@tryghost/logging');
const ALLOWED_INCLUDES = ['authors', 'tags', 'tiers'];
const ALLOWED_MEMBER_STATUSES = ['anonymous', 'free', 'paid'];

const messages = {
    postNotFound: 'Post not found.'
};

// Simulate serving content as different member states by setting the minimal
// member context needed for content gating to function
const _addMemberContextToFrame = async (frame) => {
    if (!frame?.options?.member_status) {
        return;
    }

    // only set apiType when given a member_status to preserve backwards compatibility
    // where we used to serve "Admin API" content with no gating for all previews
    frame.apiType = 'content';
    frame.isPreview = true;

    frame.original ??= {};
    frame.original.context ??= {};

    if (frame.options?.member_status === 'free') {
        frame.original.context.member = {
            status: 'free'
        };
    }

    if (frame.options?.member_status === 'paid') {
        // For member_status=paid, add all paid tiers to the member context
        let memberProducts = [];
        try {
            const paidProducts = await models.Product.findAll({
                status: 'active',
                type: 'paid'
            });
            if (paidProducts.length > 0) {
                memberProducts = paidProducts.map((product) => {
                    return {
                        slug: product.get('slug')
                    };
                });
            }
        } catch (error) {
            // Log error but don't fail preview - fallback to empty products array
            logging.error('Failed to fetch paid products for preview:', error);
        }

        frame.original.context.member = {
            status: 'paid',
            products: memberProducts
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
            'member_status'
        ],
        data: [
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                member_status: {
                    values: ALLOWED_MEMBER_STATUSES
                }
            },
            data: {
                uuid: {
                    required: true
                }
            }
        },
        async query(frame) {
            await _addMemberContextToFrame(frame);

            const model = await models.Post.findOne(Object.assign({status: 'all'}, frame.data), frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.postNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
