const linkTrackingService = require('../../services/link-tracking');
const INVALIDATE_ALL_REDIRECTS = '/r/*';

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'links',
    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter'
        ],
        permissions: true,
        async query(frame) {
            const links = await linkTrackingService.service.getLinks(frame.options);

            return {
                data: links,
                meta: {
                    pagination: {
                        total: links.length,
                        page: 1,
                        pages: 1
                    }
                }
            };
        }
    },
    bulkEdit: {
        statusCode: 200,
        headers: {
            cacheInvalidate: INVALIDATE_ALL_REDIRECTS
        },
        options: [
            'filter'
        ],
        data: [
            'action',
            'meta'
        ],
        validation: {
            data: {
                action: {
                    required: true,
                    values: ['updateLink']
                }
            },
            options: {
                filter: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            return await linkTrackingService.service.bulkEdit(frame.data.bulk, frame.options);
        }
    }
};

module.exports = controller;
