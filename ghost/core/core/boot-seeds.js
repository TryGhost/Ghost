const {buildSiteConfig} = require('./shared/config/site-config');

/**
 * The seed values boot gives the default scope. Extracted so test utilities
 * can pre-create the scope with the same shape (boot refreshes it on reuse).
 * @param {object} config - the nconf config
 */
module.exports = function bootSeeds(config) {
    return {
        siteConfig: buildSiteConfig(config),
        adapterPaths: ['', config.getContentPath('adapters'), config.get('paths').internalAdaptersPath],
        adapterConfig: config,
        getMilestonesConfig: () => config.get('milestones'),
        deploymentConfig: {get: key => config.get(key)},
        isTestEnv: () => config.isTestEnv()
    };
};
