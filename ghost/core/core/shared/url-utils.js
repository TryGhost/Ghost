const createFacade = require('./container/create-facade');
const createUrlUtils = require('./create-url-utils');

module.exports = createFacade('urlUtils', () => {
    const config = require('./config');
    const {buildSiteConfig} = require('./config/site-config');
    return createUrlUtils({siteConfig: buildSiteConfig(config)});
});
