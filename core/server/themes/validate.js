var Promise = require('bluebird'),
    config = require('../config'),
    common = require('../lib/common'),
    checkTheme;

checkTheme = function checkTheme(theme, isZip) {
    var checkPromise,
        // gscan can slow down boot time if we require on boot, for now nest the require.
        gscan = require('gscan');

    if (isZip) {
        checkPromise = gscan.checkZip(theme, {
            keepExtractedDir: true
        });
    } else {
        checkPromise = gscan.check(theme.path);
    }

    return checkPromise.then(function resultHandler(checkedTheme) {
        checkedTheme = gscan.format(checkedTheme, {
            onlyFatalErrors: config.get('env') === 'production'
        });

        // CASE: production and no fatal errors
        // CASE: development returns fatal and none fatal errors, theme is only invalid if fatal errors
        if (!checkedTheme.results.error.length ||
            config.get('env') === 'development' && !checkedTheme.results.hasFatalErrors) {
            return checkedTheme;
        }

        return Promise.reject(new common.errors.ThemeValidationError({
            message: common.i18n.t('errors.api.themes.invalidTheme'),
            errorDetails: checkedTheme.results.error,
            context: checkedTheme
        }));
    });
};

module.exports.check = checkTheme;
