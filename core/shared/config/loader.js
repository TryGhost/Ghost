const Nconf = require('nconf');
const _ = require('lodash');
const os = require('os');
const path = require('path');
const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:config');
const localUtils = require('./utils');
const env = process.env.NODE_ENV || 'development';

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
    if (env !== 'testing') {
        nconf.file('local-env', path.join(customConfigPath, 'config.local.json'));
    }
    nconf.file('default-env', path.join(baseConfigPath, 'env', 'config.' + env + '.json'));

    // Finally, we load defaults, if nothing else has a value this will
    nconf.file('defaults', path.join(baseConfigPath, 'defaults.json'));

    // ## Config Methods

    // Bind internal-only methods, not sure this is needed
    nconf.makePathsAbsolute = localUtils.makePathsAbsolute.bind(nconf);
    nconf.sanitizeDatabaseProperties = localUtils.sanitizeDatabaseProperties.bind(nconf);
    nconf.doesContentPathExist = localUtils.doesContentPathExist.bind(nconf);
    nconf.checkUrlProtocol = localUtils.checkUrlProtocol.bind(nconf);

    // Expose dynamic utility methods
    nconf.isPrivacyDisabled = localUtils.isPrivacyDisabled.bind(nconf);
    nconf.getContentPath = localUtils.getContentPath.bind(nconf);

    // ## Sanitization

    // transform all relative paths to absolute paths
    nconf.makePathsAbsolute(nconf.get('paths'), 'paths');

    // transform sqlite filename path for Ghost-CLI
    nconf.sanitizeDatabaseProperties();

    if (nconf.get('database:client') === 'sqlite3') {
        nconf.makePathsAbsolute(nconf.get('database:connection'), 'database:connection');

        // In the default SQLite test config we set the path to /tmp/ghost-test.db,
        // but this won't work on Windows, so we need to replace the /tmp bit with
        // the Windows temp folder
        const filename = nconf.get('database:connection:filename');
        if (_.isString(filename) && filename.match(/^\/tmp/)) {
            nconf.set('database:connection:filename', filename.replace(/^\/tmp/, os.tmpdir()));
        }
    }

    // Check if the URL in config has a protocol
    nconf.checkUrlProtocol();

    // Ensure that the content path exists
    nconf.doesContentPathExist();

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
