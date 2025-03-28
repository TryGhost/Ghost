const Nconf = require('nconf');
const path = require('path');
const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:config');
const localUtils = require('./utils');
const helpers = require('./helpers');
const urlHelpers = require('@tryghost/config-url-helpers');
const env = process.env.NODE_ENV || 'development';

/**
 * @param {object} options
 * @returns {Nconf.Provider & urlHelpers.BoundHelpers & helpers.ConfigHelpers}
 */
function loadNconf(options) {
    debug('config start');
    options = options || {};

    const baseConfigPath = options.baseConfigPath || __dirname;
    const customConfigPath = options.customConfigPath || process.cwd();
    const nconf = new Nconf.Provider();

    // ## Load Config

    // no channel can override the overrides
    nconf.file('overrides', path.join(baseConfigPath, 'overrides.json'));

    // command line arguments take precedence, then environment variables
    nconf.argv();
    nconf.env({separator: '__', parseValues: true});

    // Now load various config json files
    nconf.file('custom-env', path.join(customConfigPath, 'config.' + env + '.json'));
    if (!env.startsWith('testing')) {
        if (process.env.GHOST_DEV_IS_DOCKER === 'true') {
            nconf.file('docker-env', path.join(baseConfigPath, 'env', 'config.development.docker.json'));
        }
        nconf.file('local-env', path.join(customConfigPath, 'config.local.json'));
    }
    nconf.file('default-env', path.join(baseConfigPath, 'env', 'config.' + env + '.json'));

    // Finally, we load defaults, if nothing else has a value this will
    nconf.file('defaults', path.join(baseConfigPath, 'defaults.json'));

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
