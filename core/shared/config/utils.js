const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const _ = require('lodash');

/**
 * transform all relative paths to absolute paths
 * @TODO: re-write this function a little bit so we don't have to add the parent path - that is hard to understand
 *
 * Path must be string.
 * Path must match minimum one / or \
 * Path can be a "." to re-present current folder
 */
const makePathsAbsolute = function makePathsAbsolute(nconf, obj, parent) {
    _.each(obj, function (configValue, pathsKey) {
        if (_.isObject(configValue)) {
            makePathsAbsolute(nconf, configValue, parent + ':' + pathsKey);
        } else if (
            _.isString(configValue) &&
            (configValue.match(/\/+|\\+/) || configValue === '.') &&
            !path.isAbsolute(configValue)
        ) {
            nconf.set(parent + ':' + pathsKey, path.normalize(path.join(__dirname, '../../..', configValue)));
        }
    });
};

const doesContentPathExist = function doesContentPathExist(contentPath) {
    if (!fs.pathExistsSync(contentPath)) {
        // new Error is allowed here, as we do not want config to depend on @tryghost/error
        // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Your content path does not exist! Please double check `paths.contentPath` in your custom config file e.g. config.production.json.');
    }
};

/**
* Check if the URL in config has a protocol and sanitise it if not including a warning that it should be changed
*/
const checkUrlProtocol = function checkUrlProtocol(url) {
    if (!url.match(/^https?:\/\//i)) {
        // new Error is allowed here, as we do not want config to depend on @tryghost/error
        // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('URL in config must be provided with protocol, eg. "http://my-ghost-blog.com"');
    }
};

/**
 * nconf merges all database keys together and this can be confusing
 * e.g. production default database is sqlite, but you override the configuration with mysql
 *
 * this.clear('key') does not work
 * https://github.com/indexzero/nconf/issues/235#issuecomment-257606507
 */
const sanitizeDatabaseProperties = function sanitizeDatabaseProperties(nconf) {
    const database = nconf.get('database');

    if (nconf.get('database:client') === 'mysql') {
        delete database.connection.filename;
    } else {
        delete database.connection.host;
        delete database.connection.user;
        delete database.connection.password;
        delete database.connection.database;
    }

    nconf.set('database', database);

    if (nconf.get('database:client') === 'sqlite3') {
        makePathsAbsolute(nconf, nconf.get('database:connection'), 'database:connection');

        // In the default SQLite test config we set the path to /tmp/ghost-test.db,
        // but this won't work on Windows, so we need to replace the /tmp bit with
        // the Windows temp folder
        const filename = nconf.get('database:connection:filename');
        if (_.isString(filename) && filename.match(/^\/tmp/)) {
            nconf.set('database:connection:filename', filename.replace(/^\/tmp/, os.tmpdir()));
        }
    }
};

module.exports = {
    makePathsAbsolute,
    doesContentPathExist,
    checkUrlProtocol,
    sanitizeDatabaseProperties
};
