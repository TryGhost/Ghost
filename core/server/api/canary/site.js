const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');
const config = require('../../config');
const membersService = require('../../services/members');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            const response = {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                logo: settingsCache.get('logo'),
                brand: settingsCache.get('brand'),
                url: urlUtils.urlFor('home', true),
                version: ghostVersion.safe,
                // @TODO: move these to a members API
                plans: membersService.config.getPublicPlans(), // these are new members features that probably won't live here
                allowSelfSignup: membersService.config.getAllowSelfSignup() // these are new members features that probably won't live here
            };

            // Brand is currently an experimental feature
            if (!config.get('enableDeveloperExperiments')) {
                delete response.brand;
            }

            return response;
        }
    }
};

module.exports = site;
