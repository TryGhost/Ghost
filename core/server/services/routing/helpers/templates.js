// # Templates
//
// Figure out which template should be used to render a request
// based on the templates which are allowed, and what is available in the theme
// TODO: consider where this should live as it deals with collections, entries, and errors
const _ = require('lodash'),
    path = require('path'),
    url = require('url'),
    config = require('../../../config'),
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
    const errorCode = _.toString(statusCode),
        templateList = ['error'];

    // Add error class template: E.g. error-4xx.hbs or error-5xx.hbs
    templateList.unshift('error-' + errorCode[0] + 'xx');

    // Add statusCode specific template: E.g. error-404.hbs
    templateList.unshift('error-' + errorCode);

    return templateList;
};

/**
 * ## Get Collection Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this request.
 * 'index' is the default / fallback
 * For collections with slugs: [:collectionName-:slug, :collectionName, index]
 * For collections without slugs: [:collectionName, index]
 * Collections can also have a front page template which is used if this is the first page of the collections, e.g. 'home.hbs'
 *
 * @param {Object} routerOptions
 * @returns {String[]}
 */
_private.getCollectionTemplateHierarchy = function getCollectionTemplateHierarchy(routerOptions, requestOptions) {
    const templateList = ['index'];

    // CASE: author, tag
    if (routerOptions.name && routerOptions.name !== 'index') {
        templateList.unshift(routerOptions.name);

        if (routerOptions.slugTemplate && requestOptions.slugParam) {
            templateList.unshift(routerOptions.name + '-' + requestOptions.slugParam);
        }
    }

    // CASE: collections can define a template list
    if (routerOptions.templates && routerOptions.templates.length) {
        routerOptions.templates.forEach((template) => {
            templateList.unshift(template);
        });
    }

    if (routerOptions.frontPageTemplate && (requestOptions.path === '/' || requestOptions.path === '/' && requestOptions.page === 1)) {
        templateList.unshift(routerOptions.frontPageTemplate);
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
    const templateList = ['post'];
    let slugTemplate = 'post-' + postObject.slug;

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
    let template;

    if (!_.isArray(templateList)) {
        templateList = [templateList];
    }

    if (!themes.getActive()) {
        template = fallback;
    } else {
        template = _.find(templateList, function (template) {
            if (!template) {
                return;
            }

            return themes.getActive().hasTemplate(template);
        });
    }

    if (!template) {
        if (!fallback) {
            template = 'index';
        } else {
            template = fallback;
        }
    }

    return template;
};

_private.getTemplateForEntry = function getTemplateForEntry(postObject) {
    const templateList = _private.getEntryTemplateHierarchy(postObject),
        fallback = templateList[templateList.length - 1];
    return _private.pickTemplate(templateList, fallback);
};

_private.getTemplateForCollection = function getTemplateForCollection(routerOptions, requestOptions) {
    const templateList = _private.getCollectionTemplateHierarchy(routerOptions, requestOptions),
        fallback = templateList[templateList.length - 1];
    return _private.pickTemplate(templateList, fallback);
};

_private.getTemplateForError = function getTemplateForError(statusCode) {
    const templateList = _private.getErrorTemplateHierarchy(statusCode),
        fallback = path.resolve(config.get('paths').defaultViews, 'error.hbs');
    return _private.pickTemplate(templateList, fallback);
};

module.exports.setTemplate = function setTemplate(req, res, data) {
    const routeConfig = res._route || {};

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
        case 'collection':
            res._template = _private.getTemplateForCollection(res.locals.routerOptions, {
                path: url.parse(req.url).pathname,
                page: req.params.page,
                slugParam: req.params.slug
            });
            break;
        case 'entry':
            res._template = _private.getTemplateForEntry(data.post);
            break;
        default:
            res._template = 'index';
    }
};
