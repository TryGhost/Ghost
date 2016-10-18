var Nconf = require('nconf'),
    nconf = new Nconf.Provider(),
    path = require('path'),
    localUtils = require('./utils'),
    env = process.env.NODE_ENV || 'development';

/**
 * command line arguments
 */
nconf.argv();

/**
 * env arguments
 */
nconf.env({
    separator: '__'
});

/**
 * load config files
 * @TODO:
 * - why does this work? i have no idea!
 * - find out why argv override works, when defining these weird keys
 * - i could not find any nconf usages so that all config requirements work
 */
nconf.file('ghost1', __dirname + '/overrides.json');
nconf.file('ghost2', path.join(process.cwd(), 'config.' + env + '.json'));
nconf.file('ghost3', __dirname + '/env/config.' + env + '.json');
nconf.file('ghost4', __dirname + '/defaults.json');

/**
 * transform all relative paths to absolute paths
 * transform sqlite filename path for Ghost-CLI
 */
localUtils.makePathsAbsolute.bind(nconf)(nconf.get('paths'), 'paths');
localUtils.makePathsAbsolute.bind(nconf)(nconf.get('database:connection'), 'database:connection');

/**
 * values we have to set manual
 */
nconf.set('env', env);

module.exports = nconf;
module.exports.isPrivacyDisabled = localUtils.isPrivacyDisabled.bind(nconf);
module.exports.getContentPath = localUtils.getContentPath.bind(nconf);
