var nconf = require('nconf'),
    path = require('path'),
    localUtils = require('./utils'),
    packageInfo = require('../../../package.json'),
    env = process.env.NODE_ENV || 'development';

nconf.set('NODE_ENV', env);

/**
 * command line arguments
 */
nconf.argv();

/**
 * env arguments
 */
nconf.env();

/**
 * load config files
 */
nconf.file('1', __dirname + '/overrides.json');
nconf.file('2', path.join(process.cwd(), 'config.' + env + '.json'));
nconf.file('3', __dirname + '/env/config.' + env + '.json');
nconf.file('4', __dirname + '/defaults.json');

/**
 * transform all relative paths to absolute paths
 */
localUtils.makePathsAbsolute.bind(nconf)();

/**
 * values we have to set manual
 * @TODO: ghost-cli?
 */
nconf.set('ghostVersion', packageInfo.version);

module.exports = nconf;
module.exports.isPrivacyDisabled = localUtils.isPrivacyDisabled.bind(nconf);
module.exports.getContentPath = localUtils.getContentPath.bind(nconf);
