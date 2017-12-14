var _ = require('lodash'),
    themeList = require('./list'),
    active = require('./active'),
    packageJSON = require('../../lib/fs/package-json'),
    settingsCache = require('../settings/cache');

/**
 *
 * Provides a JSON object which can be returned via the API.
 * You can either request all themes or a specific theme if you pass the `name` argument.
 * Furthermore, you can pass a gscan result to filter warnings/errors.
 *
 * @TODO: settingsCache.get('active_theme') vs. active.get().name
 *
 * @param {string} [name] - the theme to output
 * @param {object} [checkedTheme] - a theme result from gscan
 * @return {*}
 */
module.exports = function toJSON(name, checkedTheme) {
    var themeResult, toFilter;

    if (!name) {
        toFilter = themeList.getAll();
        themeResult = packageJSON.filter(toFilter, settingsCache.get('active_theme'));
    } else {
        toFilter = {
            [name]: themeList.get(name)
        };

        themeResult = packageJSON.filter(toFilter, settingsCache.get('active_theme'));

        if (checkedTheme && checkedTheme.results.warning.length > 0) {
            themeResult[0].warnings = _.cloneDeep(checkedTheme.results.warning);
        }

        if (checkedTheme && checkedTheme.results.error.length > 0) {
            themeResult[0].errors = _.cloneDeep(checkedTheme.results.error);
        }
    }

    // CASE: if you want a JSON response for a single theme, which is not active.
    if (_.find(themeResult, {active: true}) && active.get()) {
        _.find(themeResult, {active: true}).templates = active.get().customTemplates;
    }

    return {themes: themeResult};
};
