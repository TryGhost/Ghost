const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            const response = {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                logo: settingsCache.get('logo'),
                accent_color: settingsCache.get('accent_color'),
                url: urlUtils.urlFor('home', true),
                version: ghostVersion.safe
            };

            return response;
        }
    }
};

module.exports = site;
