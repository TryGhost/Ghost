const debug = require('@tryghost/debug')('themes');
const _ = require('lodash');
const fs = require('fs-extra');
const config = require('../../../shared/config');
const labs = require('../../../shared/labs');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const adapterManager = require('../adapter-manager');
const logging = require('@tryghost/logging');
const list = require('./list');

const messages = {
    themeHasErrors: 'Theme "{theme}" is not compatible or contains errors.',
    activeThemeHasFatalErrors: 'The currently active theme "{theme}" has fatal errors.',
    activeThemeHasErrors: 'The currently active theme "{theme}" has errors, but will still work.',
    themeNotLoaded: 'Theme "{themeName}" is not loaded and cannot be checked.'
};

/**
 * @typedef {Object} CacheStore
 * @property {(key: string) => Promise<any>} get - get a value from the cache. Returns undefined if not found
 * @property {(key: string, value: any) => Promise<void>} set - set a value in the cache
 * @property {() => Promise<void>} reset - reset the cache
 */

/**
 * The cache store for storing the result of the last theme validation
 * @type {CacheStore}
 */
let gscanCacheStore;

module.exports.init = () => {
    gscanCacheStore = adapterManager.getAdapter('cache:gscan');
};

const canActivate = function canActivate(checkedTheme) {
    return !checkedTheme.results.hasFatalErrors;
};

const getErrorsFromCheckedTheme = function getErrorsFromCheckedTheme(checkedTheme) {
    return {
        errors: checkedTheme.results.error ?? [],
        warnings: checkedTheme.results.warning ?? []
    };
};

const check = async function check(themeName, theme, options = {}) {
    debug('Begin: Check');
    // gscan can slow down boot time if we require on boot, for now nest the require.
    const gscan = require('gscan');
    const checkedVersion = 'v5';
    let checkedTheme;

    if (options.isZip === true) {
        debug('zip mode');
        checkedTheme = await gscan.checkZip(theme, {
            keepExtractedDir: true,
            checkVersion: checkedVersion,
            labs: labs.getAll(),
            skipChecks: options.skipChecks || false
        });
    } else {
        debug('non-zip mode');
        checkedTheme = await gscan.check(theme.path, {
            checkVersion: checkedVersion,
            labs: labs.getAll(),
            skipChecks: options.skipChecks || false
        });
    }

    checkedTheme = gscan.format(checkedTheme, {
        onlyFatalErrors: false,
        checkVersion: checkedVersion
    });

    // In production we don't want to show warnings
    // Warnings are meant for developers only
    if (config.get('env') === 'production') {
        checkedTheme.results.warning = [];
    }

    // Cache warnings and errors
    try {
        await gscanCacheStore.set(themeName, getErrorsFromCheckedTheme(checkedTheme));
    } catch (err) {
        logging.error('Failed to cache gscan result');
        logging.error(err);
    }

    debug('End: Check');
    return checkedTheme;
};

/**
 * Returns the last cached errors and warnings of check() if available.
 * Otherwise runs check() on the loaded theme with that name (which will always cache the error and warning results)
 * @returns {Promise<{errors: Array, warnings: Array}>}
 */
const getThemeErrors = async function getThemeErrors(themeName) {
    try {
        const cachedThemeErrors = await gscanCacheStore.get(themeName);
        if (cachedThemeErrors) {
            return cachedThemeErrors;
        }
    } catch (err) {
        logging.error('Failed to get gscan result from cache');
        logging.error(err);
    }

    const loadedTheme = list.get(themeName);

    if (!loadedTheme) {
        throw new errors.ValidationError({
            message: tpl(messages.themeNotLoaded, {themeName: themeName}),
            errorDetails: themeName
        });
    }

    const result = await check(themeName, loadedTheme);
    return getErrorsFromCheckedTheme(result);
};

const checkSafe = async function checkSafe(themeName, theme, isZip) {
    const checkedTheme = await check(themeName, theme, {isZip});

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
                errors: checkedTheme.results.error,
                warnings: checkedTheme.results.warning
            }
        )
    });
};

module.exports.check = check;
module.exports.checkSafe = checkSafe;
module.exports.canActivate = canActivate;
module.exports.getErrorsFromCheckedTheme = getErrorsFromCheckedTheme;
module.exports.getThemeValidationError = getThemeValidationError;
module.exports.getThemeErrors = getThemeErrors;
