var _ = require('lodash'),
    themeList = require('./list'),
    packages = require('../utils/packages'),
    settingsCache = require('../settings/cache');

/**
 * Provides a JSON object which can be returned via the API
 *
 * @param {string} [name] - the theme to output
 * @param {object} [checkedTheme] - a theme result from gscan
 * @return {*}
 */
module.exports = function toJSON(name, checkedTheme) {
    var themeResult, toFilter;

    if (!name) {
        toFilter = themeList.getAll();
        // Default to returning the full list
        themeResult = packages.filterPackages(toFilter, settingsCache.get('active_theme'));
    } else {
        // If we pass in a gscan result, convert this instead
        toFilter = {
            [name]: themeList.get(name)
        };

        themeResult = packages.filterPackages(toFilter, settingsCache.get('active_theme'));

        if (checkedTheme && checkedTheme.results.warning.length > 0) {
            themeResult[0].warnings = _.cloneDeep(checkedTheme.results.warning);
        }

        if (checkedTheme && checkedTheme.results.error.length > 0) {
            themeResult[0].errors = _.cloneDeep(checkedTheme.results.error);
        }
    }

    return {themes: themeResult};
};
