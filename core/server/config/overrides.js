/*jshint laxcomma: true, smarttabs: true, node: true*/
'use strict';

/**
 * System overrides that can not be changed at runtime
 * @module ghost/core/server/config/overrides
 * @since 0.5.10
 * @requires path
 */

var path = require('path'),
    core,
    ghost,
    contentPath;

ghost = path.resolve(__dirname, '..', '..', '..');
core  = path.resolve(ghost, 'core');
contentPath = path.resolve(ghost, 'content');

/**
 * @readonly
 * @property {String} GHOST_PATH A resolved path the the location where ghost is installed
 **/
exports.GHOST_PATH      = ghost;
/**
 * @readonly
 * @property {String} CORE_PATH A resolved path to where ghost's core folder is located
 **/
exports.CORE_PATH       = core;                                      // corePath
/**
 * @readonly
 * @property {String} THEME_PATH a resolved path to the primary themes directory
 **/
exports.THEME_PATH      = path.resolve(contentPath, 'themes');       // themePath
/**
 * @readonly
 * @property {String} APP_PATH a resolved path to the primary app directory
 **/
exports.APP_PATH        = path.resolve(contentPath, 'apps');         // appPath
/**
 * @readonly
 * @property {String} IMAGES_PATH a resolved path to the directory where content images are located
 **/
exports.IMAGES_PATH     = path.resolve(contentPath, 'images');       // imagesPath
/**
 * @readonly
 * @property {String} ADMIN_PATH a resolved path to the primary admin views are located
 **/
exports.ADMIN_PATH      = path.join(core, 'server', 'views');         // adminViews
/**
 * @readonly
 * @property {String} EXPORT_PATH a resolved path where data exports will be placed
 **/
exports.EXPORT_PATH     = path.join(core, 'server', 'data', 'export'); // exportPath
/**
 * @readonly
 * @property {String} LANG_PATH a resolved path to where i18n files will be located
 **/
exports.LANG_PATH       = path.join(core, 'shared', 'lang');          // lang
/**
 * @readonly
 * @property {String} helperTemplates a resolved path to where helper templates are located
 **/
exports.helperTemplates = path.join(core, 'server', 'helpers', 'tpl'); // helperTemplates

/**
 * @readonly
 * @property {Object} slugs
 * @property {String[]} slugs.protected slug fragements that can not be altered for internal use
 **/
exports.slugs = {
    protected: ['ghost', 'rss']
};

/**
 * @readonly
 * @property {String[]} deprecatedItems item paths of configuration properties that are
 * considered depricated and to be removed
 **/
exports.deprecatedItems = ['updateCheck', 'mail.fromaddress'];
