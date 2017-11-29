// # Templates
//
// Figure out which template should be used to render a request
// based on the templates which are allowed, and what is available in the theme
// TODO: consider where this should live as it deals with channels, singles, and errors
var _ = require('lodash'),
    path = require('path'),
    config = require('../../config'),
    themes = require('../../themes'),
    _private = {};

/**
 * ## Get Error Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this error statusCode.
 *
 * The default is the
 *
 * @param {integer} statusCode
 * @returns {String[]}
 */
_private.getErrorTemplateHierarchy = function getErrorTemplateHierarchy(statusCode) {
    var errorCode = _.toString(statusCode),
        templateList = ['error'];

    // Add error class template: E.g. error-4xx.hbs or error-5xx.hbs
    templateList.unshift('error-' + errorCode[0] + 'xx');

    // Add statusCode specific template: E.g. error-404.hbs
    templateList.unshift('error-' + errorCode);

    return templateList;
};

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
_private.getChannelTemplateHierarchy = function getChannelTemplateHierarchy(channelOpts) {
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
};

/**
 * ## Get Entry Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this request.
 * 'post' is the default / fallback
 * For posts: [post-:slug, custom-*, post]
 * For pages: [page-:slug, custom-*, page, post]
 *
 * @param {Object} postObject
 * @returns {String[]}
 */
_private.getEntryTemplateHierarchy = function getEntryTemplateHierarchy(postObject) {
    var templateList = ['post'],
        slugTemplate = 'post-' + postObject.slug;

    if (postObject.page) {
        templateList.unshift('page');
        slugTemplate = 'page-' + postObject.slug;
    }

    if (postObject.custom_template) {
        templateList.unshift(postObject.custom_template);
    }

    templateList.unshift(slugTemplate);

    return templateList;
};

/**
 * ## Pick Template
 *
 * Taking the ordered list of allowed templates for this request
 * Cycle through and find the first one which has a match in the theme
 *
 * @param {Array|String} templateList
 * @param {String} fallback - a fallback template
 */
_private.pickTemplate = function pickTemplate(templateList, fallback) {
    var template;

    if (!_.isArray(templateList)) {
        templateList = [templateList];
    }

    if (!themes.getActive()) {
        template = fallback;
    } else {
        template = _.find(templateList, function (template) {
            return themes.getActive().hasTemplate(template);
        });
    }

    if (!template) {
        template = fallback;
    }

    return template;
};

_private.getTemplateForEntry = function getTemplateForEntry(postObject) {
    var templateList = _private.getEntryTemplateHierarchy(postObject),
        fallback = templateList[templateList.length - 1];
    return _private.pickTemplate(templateList, fallback);
};

_private.getTemplateForChannel = function getTemplateForChannel(channelOpts) {
    var templateList = _private.getChannelTemplateHierarchy(channelOpts),
        fallback = templateList[templateList.length - 1];
    return _private.pickTemplate(templateList, fallback);
};

_private.getTemplateForError = function getTemplateForError(statusCode) {
    var templateList = _private.getErrorTemplateHierarchy(statusCode),
        fallback = path.resolve(config.get('paths').defaultViews, 'error.hbs');
    return _private.pickTemplate(templateList, fallback);
};

module.exports.setTemplate = function setTemplate(req, res, data) {
    var routeConfig = res._route || {};

    if (res._template && !req.err) {
        return;
    }

    if (req.err) {
        res._template = _private.getTemplateForError(res.statusCode);
        return;
    }

    switch (routeConfig.type) {
        case 'custom':
            res._template = _private.pickTemplate(routeConfig.templateName, routeConfig.defaultTemplate);
            break;
        case 'channel':
            res._template = _private.getTemplateForChannel(res.locals.channel);
            break;
        case 'entry':
            res._template = _private.getTemplateForEntry(data.post);
            break;
        default:
            res._template = 'index';
    }
};
