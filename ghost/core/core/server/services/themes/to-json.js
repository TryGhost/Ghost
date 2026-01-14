const _ = require('lodash');
const themeList = require('./list');
const bridge = require('../../../bridge');
const packageJSON = require('../../lib/package-json');
const settingsCache = require('../../../shared/settings-cache');

/**
 *
 * Provides a JSON object which can be returned via the API.
 * You can either request all themes or a specific theme if you pass the `name` argument.
 * Furthermore, you can pass a gscan result to filter warnings/errors.
 *
 * @TODO: settingsCache.get('active_theme') vs. active.get().name
 *
 * @param {string} [name] - the theme to output
 * @param {{errors: Array, warnings: Array}} [themeErrors] - Error and warning results from checked theme (if available)
 * @return {}
 */
module.exports = function toJSON(name, themeErrors) {
    let themeResult;
    let toFilter;

    if (!name) {
        toFilter = themeList.getAll();
        themeResult = packageJSON.filter(toFilter, settingsCache.get('active_theme'));
    } else {
        toFilter = {
            [name]: themeList.get(name)
        };

        themeResult = packageJSON.filter(toFilter, settingsCache.get('active_theme'));

        if (themeErrors && themeErrors.warnings.length) {
            themeResult[0].warnings = _.cloneDeep(themeErrors.warnings);
        }

        if (themeErrors && themeErrors.errors.length) {
            themeResult[0].errors = _.cloneDeep(themeErrors.errors);
        }
    }

    // CASE: if you want a JSON response for a single theme, which is not active.
    if (_.find(themeResult, {active: true}) && bridge.getActiveTheme()) {
        _.find(themeResult, {active: true}).templates = bridge.getActiveTheme().customTemplates;
    }

    return {themes: themeResult};
};
