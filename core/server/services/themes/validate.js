const debug = require('@tryghost/debug')('themes');
const _ = require('lodash');
const fs = require('fs-extra');
const config = require('../../../shared/config');
const labs = require('../../../shared/labs');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    themeHasErrors: 'Theme "{theme}" is not compatible or contains errors.',
    activeThemeHasFatalErrors: 'The currently active theme "{theme}" has fatal errors.',
    activeThemeHasErrors: 'The currently active theme "{theme}" has errors, but will still work.'
};

const canActivate = function canActivate(checkedTheme) {
    // CASE: production and no fatal errors
    // CASE: development returns fatal and none fatal errors, theme is only invalid if fatal errors
    return !checkedTheme.results.error.length || (config.get('env') === 'development') && !checkedTheme.results.hasFatalErrors;
};

const check = async function check(theme, isZip) {
    debug('Begin: Check');
    // gscan can slow down boot time if we require on boot, for now nest the require.
    const gscan = require('gscan');
    let checkedTheme;

    if (isZip) {
        debug('zip mode');
        checkedTheme = await gscan.checkZip(theme, {
            keepExtractedDir: true,
            checkVersion: 'canary',
            labs: labs.getAll()
        });
    } else {
        debug('non-zip mode');
        checkedTheme = await gscan.check(theme.path, {
            checkVersion: 'canary',
            labs: labs.getAll()
        });
    }

    checkedTheme = gscan.format(checkedTheme, {
        onlyFatalErrors: config.get('env') === 'production',
        checkVersion: 'canary'
    });

    debug('End: Check');
    return checkedTheme;
};

const checkSafe = async function checkSafe(themeName, theme, isZip) {
    const checkedTheme = await check(theme, isZip);

    if (canActivate(checkedTheme)) {
        return checkedTheme;
    }

    // NOTE: When theme cannot be activated and gscan explicitly keeps extracted files (after
    //       being called with `keepExtractedDir: true`), this is the best place for a cleanup.
    // TODO: The `keepExtractedDir` flag is the cause of confusion for when and where the cleanup
    //       should be done. It's probably best if gscan is called directly with path to the extracted
    //       directory, this would allow keeping gscan to do just one thing - validate the theme, and
    //       file manipulations could be left to another module/library
    if (isZip) {
        fs.remove(checkedTheme.path);
    }

    throw getThemeValidationError('themeHasErrors', themeName, checkedTheme);
};

const getThemeValidationError = (message, themeName, checkedTheme) => {
    return new errors.ThemeValidationError({
        message: tpl(messages[message], {theme: themeName}),
        errorDetails: Object.assign(
            _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                errors: checkedTheme.results.error
            }
        )
    });
};

module.exports.check = check;
module.exports.checkSafe = checkSafe;
module.exports.canActivate = canActivate;
module.exports.getThemeValidationError = getThemeValidationError;
