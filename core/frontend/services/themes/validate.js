const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const config = require('../../../shared/config');
const {i18n} = require('../proxy');
const errors = require('@tryghost/errors');

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
            keepExtractedDir: true,
            checkVersion: 'canary'
        });
    } else {
        checkPromise = gscan.check(theme.path, {
            checkVersion: 'canary'
        });
    }

    return checkPromise
        .then(function resultHandler(checkedTheme) {
            checkedTheme = gscan.format(checkedTheme, {
                onlyFatalErrors: config.get('env') === 'production',
                checkVersion: 'canary'
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

            // NOTE: When theme cannot be activated and gscan explicitly keeps extracted files (after
            //       being called with `keepExtractedDir: true`), this is the closes place for a cleanup.
            // TODO: The `keepExtractedDir` flag is the cause of confusion for when and where the cleanup
            //       should be done. It's probably best if gscan is called directly with path to the extracted
            //       directory, this would allow keeping gscan to do just one thing - validate the theme, and
            //       file manipulations could be left to another module/library
            if (isZip) {
                fs.remove(checkedTheme.path);
            }

            return Promise.reject(new errors.ThemeValidationError({
                message: i18n.t('errors.api.themes.invalidTheme'),
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
