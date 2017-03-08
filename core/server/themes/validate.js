var Promise = require('bluebird'),
    gscan = require('gscan'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    checkTheme;

checkTheme = function checkTheme(theme, isZip) {
    var checkPromise;

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
