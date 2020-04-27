const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');
// const membersService = require('../../services/members');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            return {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                logo: settingsCache.get('logo'),
                // brand: settingsCache.get('brand'), // this is a dev experiments feature & needs to be behind the flag
                url: urlUtils.urlFor('home', true),
                // plans: membersService.config.getPublicPlans(), // these are new members features that probably won't live here
                // allowSelfSignup: membersService.config.getAllowSelfSignup(), // these are new members features that probably won't live here
                version: ghostVersion.safe
            };
        }
    }
};

module.exports = site;
