const linkTrackingService = require('../../services/link-tracking');

module.exports = {
    docName: 'links',
    browse: {
        options: [
            'filter'
        ],
        permissions: false,
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
    }
};
