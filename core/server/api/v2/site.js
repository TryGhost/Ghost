const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            return {
                title: settingsCache.get('title'),
                url: urlUtils.urlFor('home', true),
                version: ghostVersion.safe
            };
        }
    }
};

module.exports = site;
