const linksService = require('../../services/link-redirection');
const linkTrackingService = require('../../services/link-click-tracking');

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
                        total: 1,
                        page: 1,
                        pages: 1
                    }
                }
            };
        }
    }
};
