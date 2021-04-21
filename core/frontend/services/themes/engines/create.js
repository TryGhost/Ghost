const semver = require('semver');
const config = require('../../../../shared/config');

/**
 * Valid definitions for "ghost-api":
 *
 * ^2
 * ^2.0.0
 * 2.0.0
 * v4
 * v3
 * v2
 * canary
 *
 * Goal: Extract major version from input.
 *
 * @param packageJson
 * @returns {*}
 */
module.exports = (packageJson) => {
    let themeEngines = {'ghost-api': config.get('api:versions:default')};

    if (packageJson && Object.prototype.hasOwnProperty.call(packageJson, 'engines')) {
        // CASE: validate
        if (packageJson.engines['ghost-api']) {
            const availableApiVersions = {};
            config.get('api:versions:all').forEach((version) => {
                if (version === 'canary') {
                    availableApiVersions.canary = version;
                } else {
                    availableApiVersions[semver.major(semver.coerce(version).version)] = version;
                }
            });

            const apiVersion = packageJson.engines['ghost-api'];
            const apiVersionMajor = apiVersion === 'canary' ? 'canary' : semver.major(semver.coerce(apiVersion).version);

            if (availableApiVersions[apiVersionMajor]) {
                themeEngines['ghost-api'] = availableApiVersions[apiVersionMajor];
            }
        }
    }

    return themeEngines;
};
