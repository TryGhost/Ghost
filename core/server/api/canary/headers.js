const path = require('path');

const web = require('../../web');
const frontendHeaders = require('../../../frontend/services/headers');

module.exports = {
    docName: 'headers',

	// MODELED AFTER REDIRECTS.JS AND SETTINGS.JS +++
    download: {
        headers: {
            disposition: {
                type: 'yaml',
                value: 'headers.yaml'
            }
        },
        permissions: true,
        response: {
            format: 'plain'
        },
        query() {
            return frontendHeaders.settings.get();
        }
    },

	// MODELED AFTER REDIRECTS.JS +++
    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
			
            return frontendHeaders.settings.setFromFilePath(frame.file.path)
                .then(() => {
                    // TODO: In redirects.js which this file is modeled after,
					// in this spot was the following:
                    /* // CASE: trigger that redirects are getting re-registered
                       web.shared.middlewares.customRedirects.reload(); */
					// Is something similar wanted here?
                });
        }
    }
};
