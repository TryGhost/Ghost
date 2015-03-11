/*jshint laxcomma: true, smarttabs: true, node:true*/
'use strict';
/**
 * Configuration default values to use if none are specified
 * @module ghost/core/server/config/defaults
 * @since 0.5.10
 * @requires path
 * @requires util
 * @requires crypto
 * @requires ghost/core/server/config/overrides
 */

var path          = require('path'),
    util          = require('util'),
    crypto        = require('crypto'),
    overrides     = require('./overrides'),
    packageInfo   = require('../../../package.json'),
    contentPath   = path.resolve(overrides.GHOST_PATH, 'content');

/**
 * Contains paths used by ghost to store, and locate information and interpolate URIs
 * @property {Object} paths
 * @property {String} [paths.config] The location of the defaults configuration module
 * @property {String} [paths.imagesPath] Path to the directory where images will be stored
 * @property {String} [paths.appPath] Directory where apps are located relative to the contentPath
 * @property {String} [paths.contentPath] The directory where ghost system directories, `apps`, `themes` and `images` reside
 * @property {String} [paths.adminViews] The path to the directory where the primary admin veiws are located
 * @property {Object} [paths.availableApps={}]
 * @property {String} [paths.helperTemplates] Directory to ghost helper templates
 * @property {String} [paths.configExample] path the the example configuration file
 * @property {Object} [paths.availableThemes={}]
 * @property {String} [paths.imagesRelPath=content/images]
 * @property {String} [paths.lang] Directory i18n files
 * @property {String} [paths.themePath] The location of the themes directory, relative to the contentPath
 * @property {String} [paths.appRoot] The top level directory of where the ghost package lives
 * @property {String} [paths.exportPath] The path to a directory where database data exports will be saved
 * @property {String} [paths.corePath] The path to ghosts `core` directory
 * @property {String} [paths.clientAssets]
 **/
exports.paths = {
    config: path.join(overrides.GHOST_PATH, 'config.js'),
    availableThemes: {},
    availableApps: {},
    appRoot: overrides.GHOST_PATH,
    configExample: path.join(overrides.GHOST_PATH, 'config.example.js'),
    corePath: overrides.CORE_PATH,
    contentPath: contentPath,
    themePath: path.resolve(contentPath, 'themes'),
    appPath: path.resolve(contentPath, 'apps'),
    imagesPath: path.resolve(contentPath, 'images'),
    imagesRelPath: 'content/images',
    adminViews: path.join(overrides.CORE_PATH, '/server/views/'),
    helperTemplates: path.join(overrides.CORE_PATH, '/server/helpers/tpl/'),
    exportPath: path.join(overrides.CORE_PATH, '/server/data/export/'),
    lang: path.join(overrides.CORE_PATH, '/shared/lang/'),
    clientAssets: path.join(overrides.CORE_PATH, '/built/assets/')
};

/**
 * @name routeKeywords
 * @memberof module:ghost/core/server/config/defaults
 * @property {Object} routeKeywords
 * @property {String} routeKeywords.tag tag key word
 * @property {String} routeKeywords.author author key word
 * @property {String} routeKeywords.page page key word
 **/
exports.routeKeywords = {
    tag: 'tag',
    author: 'author',
    page: 'page'
};

exports.storage = {
    active: 'local-file-store'
};

/**
 * @name slugs
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} slugs
 * @property {String[]} slugs.reserved slugs fragements that are used internally by ghost, but can be extended
 **/
exports.slugs = {
    // Used by generateSlug to generate slugs for posts, tags, users, ..
    reserved: ['admin', 'app', 'apps', 'archive', 'archives', 'categories', 'category', 'dashboard', 'feed', 'ghost-admin', 'login', 'logout', 'page', 'pages', 'post', 'posts', 'public', 'register', 'setup', 'signin', 'signout', 'signup', 'tag', 'tags', 'user', 'users', 'wp-admin', 'wp-login']
};

/**
 * @name uploads
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} uploads
 * @property {String[]} [uploads.extensions=['.jpg', '.jpeg', '.gif', '.png', '.svg', '.svgz']]
 * @property {String[]} [uploads.contentTypes=['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']]
 **/
exports.uploads = {
    // Used by the upload API to limit uploads to images
    extensions: ['.jpg', '.jpeg', '.gif', '.png', '.svg', '.svgz'],
    contentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
};

/**
 * @name assetHash
 * @memberof module:ghost/core/server/config/defaults
 * @property (String} assetHash Cache buster fragement for static assets. Generated when ever the server restarts
 **/
exports.assetHash = (crypto.createHash('md5').update(packageInfo.version + Date.now()).digest('hex')).substring(0, 10);
/**
 * @name ghostVersion
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} ghostVersion current version of the installed ghost instance
 **/
exports.ghostVersion = packageInfo.version;
/**
 * @name server
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} server
 * @property {String} [server.host=127.0.0.1] The host name or ip ghost will listen on
 * @property {Number} [server.port=2368] The port ghost will run on
 **/
exports.server = {
    host:'127.0.0.1',
    port:2368
};
/**
 * @name url
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} [url=http://127.0.0.1:2368] The full url of the host server instance
 **/
exports.url = util.format('http://%s:%s', exports.server.host, exports.server.port);

/**
 * @name rateSigninPeriod
 * @memberof module:ghost/core/server/config/defaults
 * @property (Number} [rateSigninPeriod=3600] Cool down period for allowable number of sign in attempts
 **/
exports.rateSigninPeriod = 3600;
/**
 * @name rateSigninAttempts
 * @memberof module:ghost/core/server/config/defaults
 * @property (Number} [rateSigninAttempts=10] maximum number of sign in attempts during `rateSigninPeriod`
 **/
exports.rateSigninAttempts = 10;
/**
 * @name rateForgottenPeriod
 * @property (Number} [rateForgottenPeriod=3600] time in ms for forgot password attempts
 **/
exports.rateForgottenPeriod = 3600;
/**
 * @name rateForgottenAttempts
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} [rateForgottenAttempts=5] Maximum number of forgot password attempts in the `rateForgottenPeriod`
 **/
exports.rateForgottenAttempts = 5;
/**
 * @name database
 * @memberof module:ghost/core/server/config/defaults
 * @property (Object} database
 * @property {String} [database.client=sqlite3] `sqlite3`, `mysql`, `pg`, `postgres`
 * @property {Object} database.connection Connection information specific for the backend
 * @property {String} database.connection.filename=/content/data/ghost-dev.db database file location for sqlite
 * @property {Boolean} [database.debug=false] If true, database quries are logged to `stdout`
 **/
exports.database = {
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, '/content/data/ghost-dev.db')
    },
    debug: false
};
