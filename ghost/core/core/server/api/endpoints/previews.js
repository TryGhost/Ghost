const getPostServiceInstance = require('../../services/posts/posts-service');
const postsService = getPostServiceInstance();

const ALLOWED_INCLUDES = ['authors', 'tags'];
const ALLOWED_MEMBER_STATUSES = ['anonymous', 'free', 'paid'];

// minimal member-like objects needed to simulate fetching content as a member
const PREVIEW_MEMBERS = {
    anonymous: undefined,
    free: {status: 'free'},
    paid: {status: 'paid'}
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
        // eslint-disable-next-line ghost/ghost-custom/max-api-complexity
        query(frame) {
            // previews are designed for previewing content before it's published
            // so we need to override Post's default status='published' filter
            frame.data.status = 'all';

            // When we're given a memberStatus, we need to simulate fetching content with that member status.
            // When we don't have a memberStatus, we're serving content as an admin which displays
            // all content for backwards-compatibility with earlier preview API behaviour
            if (Object.prototype.hasOwnProperty.call(frame.options, 'memberStatus')) {
                frame.apiType = 'content';
                frame.options.context ??= {};
                frame.options.context.member = PREVIEW_MEMBERS[frame.options.memberStatus];
            }

            return postsService.readPost(frame);
        }
    }
};

module.exports = controller;
