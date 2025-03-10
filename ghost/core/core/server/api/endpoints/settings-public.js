const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const ghostVersion = require('@tryghost/version');
const config = require('../../../shared/config');
const labs = require('../../../shared/labs');

const getCaptchaSettings = () => {
    if (labs.isSet('captcha')) {
        return {
            captcha_sitekey: config.get('captcha:siteKey')
        };
    } else {
        return {
            captcha_enabled: false
        };
    }
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'settings',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            // @TODO: decouple settings cache from API knowledge
            // The controller fetches models (or cached models) and the API frame for the target API version formats the response.
            return Object.assign({},
                settingsCache.getPublic(), {
                    url: urlUtils.urlFor('home', true),
                    version: ghostVersion.safe
                },
                getCaptchaSettings()
            );
        }
    }
};

module.exports = controller;
