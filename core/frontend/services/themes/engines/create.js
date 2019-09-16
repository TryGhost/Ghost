const _ = require('lodash');
const semver = require('semver');
const config = require('../../../../server/config');
const DEFAULTS = require('./defaults');
const allowedKeys = ['ghost-api'];

/**
 * Valid definitions for "ghost-api":
 *
 * ^0.1
 * ^2
 * ^0.1.0
 * ^2.0.0
 * 2.0.0
 * v3
 * v2
 * v0.1
 * canary
 *
 * Goal: Extract major version from input.
 *
 * @param packageJson
 * @returns {*}
 */
module.exports = (packageJson) => {
    let themeEngines = _.cloneDeep(DEFAULTS);

    if (packageJson && Object.prototype.hasOwnProperty.call(packageJson, 'engines')) {
        // CASE: validate
        if (packageJson.engines['ghost-api']) {
            const availableApiVersions = {};
            config.get('api:versions:all').forEach((version) => {
                if (version === 'canary') {
                    availableApiVersions.canary = version;
                } else {
                    availableApiVersions[semver(semver.coerce(version).version).major] = version;
                }
            });

            const apiVersion = packageJson.engines['ghost-api'];
            const apiVersionMajor = apiVersion === 'canary' ? 'canary' : semver(semver.coerce(apiVersion).version).major;

            if (availableApiVersions[apiVersionMajor]) {
                packageJson.engines['ghost-api'] = availableApiVersions[apiVersionMajor];
            } else {
                packageJson.engines['ghost-api'] = 'v3';
            }
        }

        themeEngines = _.assign(themeEngines, _.pick(packageJson.engines, allowedKeys));
    }

    return themeEngines;
};
