const _ = require('lodash');
const Promise = require('bluebird');
const config = require('../../config');
const common = require('../../lib/common');

const canActivate = function canActivate(checkedTheme) {
    // CASE: production and no fatal errors
    // CASE: development returns fatal and none fatal errors, theme is only invalid if fatal errors
    return !checkedTheme.results.error.length || (config.get('env') === 'development') && !checkedTheme.results.hasFatalErrors;
};

const check = function check(theme, isZip) {
    // gscan can slow down boot time if we require on boot, for now nest the require.
    const gscan = require('gscan');
    let checkPromise;

    if (isZip) {
        checkPromise = gscan.checkZip(theme, {
            keepExtractedDir: true
        });
    } else {
        checkPromise = gscan.check(theme.path);
    }

    return checkPromise
        .then(function resultHandler(checkedTheme) {
            checkedTheme = gscan.format(checkedTheme, {
                onlyFatalErrors: config.get('env') === 'production'
            });

            return checkedTheme;
        });
};

const checkSafe = function checkSafe(theme, isZip) {
    return check(theme, isZip)
        .then((checkedTheme) => {
            if (canActivate(checkedTheme)) {
                return checkedTheme;
            }

            return Promise.reject(new common.errors.ThemeValidationError({
                message: common.i18n.t('errors.api.themes.invalidTheme'),
                errorDetails: Object.assign(
                    _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                        errors: checkedTheme.results.error
                    }
                )
            }));
        });
};

module.exports.check = check;
module.exports.checkSafe = checkSafe;
module.exports.canActivate = canActivate;
