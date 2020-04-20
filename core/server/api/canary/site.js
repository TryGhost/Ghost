const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');
const membersService = require('../../services/members');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            return {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                logo: settingsCache.get('logo'),
                brand: settingsCache.get('brand'),
                url: urlUtils.urlFor('home', true),
                plans: membersService.config.getPublicPlans(),
                allowSelfSignup: membersService.config.getAllowSelfSignup(),
                version: ghostVersion.safe
            };
        }
    }
};

module.exports = site;
