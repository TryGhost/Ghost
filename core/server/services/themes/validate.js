const _ = require('lodash');
const Promise = require('bluebird');
const config = require('../../config');
const common = require('../../lib/common');

let checkTheme;

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

    return checkPromise
        .then(function resultHandler(checkedTheme) {
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
                errorDetails: Object.assign(
                    _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                        errors: checkedTheme.results.error
                    }
                ),
                // NOTE: needs to be removed but first has to be decoupled
                //       from logic here: https://github.com/TryGhost/Ghost/blob/9810834/core/server/services/themes/index.js#L56-L57
                context: checkedTheme
            }));
        }).catch(function (error) {
            return Promise.reject(error);
        });
};

module.exports.check = checkTheme;
