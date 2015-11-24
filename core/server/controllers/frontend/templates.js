// # Templates
//
// Figure out which template should be used to render a request
// based on the templates which are allowed, and what is available in the theme
var _      = require('lodash'),
    config = require('../../config');

function getActiveThemePaths(activeTheme) {
    return config.paths.availableThemes[activeTheme];
}

/**
 * ## Get Channel Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this request.
 * 'index' is the default / fallback
 * For channels with slugs: [:channelName-:slug, :channelName, index]
 * For channels without slugs: [:channelName, index]
 * Channels can also have a front page template which is used if this is the first page of the channel, e.g. 'home.hbs'
 *
 * @param {Object} channelOpts
 * @returns {String[]}
 */
function getChannelTemplateHierarchy(channelOpts) {
    var templateList = ['index'];

    if (channelOpts.name && channelOpts.name !== 'index') {
        templateList.unshift(channelOpts.name);

        if (channelOpts.slugTemplate && channelOpts.slugParam) {
            templateList.unshift(channelOpts.name + '-' + channelOpts.slugParam);
        }
    }

    if (channelOpts.frontPageTemplate && channelOpts.postOptions.page === 1) {
        templateList.unshift(channelOpts.frontPageTemplate);
    }

    return templateList;
}

/**
 * ## Get Single Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this request.
 * 'post' is the default / fallback
 * For posts: [post-:slug, post]
 * For pages: [page-:slug, page, post]
 *
 * @param {Object} single
 * @returns {String[]}
 */
function getSingleTemplateHierarchy(single) {
    var templateList = ['post'],
        type = 'post';

    if (single.page) {
        templateList.unshift('page');
        type = 'page';
    }

    templateList.unshift(type + '-' + single.slug);

    return templateList;
}

/**
 * ## Pick Template
 *
 * Taking the ordered list of allowed templates for this request
 * Cycle through and find the first one which has a match in the theme
 *
 * @param {Object} themePaths
 * @param {Array} templateList
 */
function pickTemplate(themePaths, templateList) {
    var template = _.find(templateList, function (template) {
        return themePaths.hasOwnProperty(template + '.hbs');
    });

    if (!template) {
        template = templateList[templateList.length - 1];
    }

    return template;
}

function getTemplateForSingle(activeTheme, single) {
    return pickTemplate(getActiveThemePaths(activeTheme), getSingleTemplateHierarchy(single));
}

function getTemplateForChannel(activeTheme, channelOpts) {
    return pickTemplate(getActiveThemePaths(activeTheme), getChannelTemplateHierarchy(channelOpts));
}

module.exports = {
    getActiveThemePaths: getActiveThemePaths,
    channel: getTemplateForChannel,
    single: getTemplateForSingle
};
