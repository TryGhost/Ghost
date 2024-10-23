const Nconf = require('nconf');
const path = require('path');
const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:config');
const localUtils = require('./utils');
const helpers = require('./helpers');
const urlHelpers = require('@tryghost/config-url-helpers');

function getEnv() {
    return process.env.NODE_ENV || 'development';
}

function getIsDevContainer() {
    return process.env.DEVCONTAINER === 'true';
}

/**
 * @param {object} options
 * @returns {Nconf.Provider & urlHelpers.BoundHelpers & helpers.ConfigHelpers}
 */
function loadNconf(options) {
    debug('config start');
    options = options || {};
    
    const env = getEnv();
    const isDevContainer = getIsDevContainer();
    const isNotTesting = !env.startsWith('testing');

    const baseConfigPath = options.baseConfigPath || __dirname;
    const customConfigPath = options.customConfigPath || process.cwd();
    const nconf = new Nconf.Provider();

    const configFilePaths = {
        overrides: path.join(baseConfigPath, 'overrides.json'),
        defaults: path.join(baseConfigPath, 'defaults.json'),
        devcontainerEnv: path.join(baseConfigPath, 'env', 'config.devcontainer.json'),
        defaultEnv: path.join(baseConfigPath, 'env', 'config.' + env + '.json'),
        customEnv: path.join(customConfigPath, 'config.' + env + '.json'),
        localEnv: path.join(customConfigPath, 'config.local.json')
    };

    // ## Load Config
    // ### Strongest to weakest

    // no channel can override the overrides
    nconf.file('overrides', configFilePaths.overrides);

    // command line arguments take precedence, then environment variables
    nconf.argv();
    nconf.env({separator: '__', parseValues: true});

    // Now load various config json files
    // Custom environment config first
    nconf.file('custom-env', configFilePaths.customEnv);

    // Devcontainer environment config only if not testing
    // Local config should not override devcontainer config (database, redis, etc.)
    if (isNotTesting) {
        if (isDevContainer) {
            nconf.file('devcontainer-env', configFilePaths.devcontainerEnv);
        }
        nconf.file('local-env', configFilePaths.localEnv);
    }

    // Default environment configs
    nconf.file('default-env', configFilePaths.defaultEnv);

    // Finally, we load defaults, if nothing else has a value this will
    nconf.file('defaults', configFilePaths.defaults);

    // ## Config Methods

    // Expose dynamic utility methods
    urlHelpers.bindAll(nconf);
    helpers.bindAll(nconf);

    // ## Sanitization

    // transform all relative paths to absolute paths
    localUtils.makePathsAbsolute(nconf, nconf.get('paths'), 'paths');

    // transform sqlite filename path for Ghost-CLI
    localUtils.sanitizeDatabaseProperties(nconf);

    // Check if the URL in config has a protocol
    localUtils.checkUrlProtocol(nconf.get('url'));

    // Ensure that the content path exists
    localUtils.doesContentPathExist(nconf.get('paths:contentPath'));

    // ## Other Stuff!

    // Manually set values
    nconf.set('env', env);

    // Wrap this in a check, because else nconf.get() is executed unnecessarily
    // To output this, use DEBUG=ghost:*,ghost-config
    if (_debug.enabled('ghost-config')) {
        debug(nconf.get());
    }

    debug('config end');
    return nconf;
}

module.exports.loadNconf = loadNconf;
