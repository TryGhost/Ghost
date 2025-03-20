const getPostServiceInstance = require('../../services/posts/posts-service');
const postsService = getPostServiceInstance();

const ALLOWED_INCLUDES = ['authors', 'tags', 'tiers'];

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'email_post',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: [
            'include'
        ],
        data: [
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            },
            data: {
                uuid: {
                    required: true
                }
            }
        },
        query(frame) {
            const data = {
                ...frame.data,
                status: 'sent'
            };

            return postsService.readPost({...frame, data});
        }
    }
};

module.exports = controller;
