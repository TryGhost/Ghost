var Promise = require('bluebird'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    checkTheme;

checkTheme = function checkTheme(theme, isZip) {
    var checkPromise,
        // gscan can slow down boot time if we require on boot, for now nest the require.
        gscan = require('gscan');

    if (isZip) {
        checkPromise = gscan.checkZip(theme, {keepExtractedDir: true});
    } else {
        checkPromise = gscan.check(theme.path);
    }

    return checkPromise.then(function resultHandler(checkedTheme) {
        checkedTheme = gscan.format(checkedTheme);

        // @TODO improve gscan results
        if (!checkedTheme.results.error.length) {
            return checkedTheme;
        }

        return Promise.reject(new errors.ThemeValidationError({
            message: i18n.t('errors.api.themes.invalidTheme'),
            errorDetails: checkedTheme.results.error
        }));
    });
};

module.exports.check = checkTheme;
