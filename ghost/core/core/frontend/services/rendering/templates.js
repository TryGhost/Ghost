// # Templates
//
// Figure out which template should be used to render a request
// based on the templates which are allowed, and what is available in the theme
const _ = require('lodash');

const path = require('path');
const url = require('url');
const config = require('../../../shared/config');
const themeEngine = require('../theme-engine');
const templates = {};

/**
 * @description Get Error Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this error statusCode.
 *
 * The default is the
 *
 * @param {integer} statusCode
 * @returns {String[]}
 */
templates.getErrorTemplateHierarchy = function getErrorTemplateHierarchy(statusCode) {
    const errorCode = _.toString(statusCode);
    const templateList = ['error'];

    // Add error class template: E.g. error-4xx.hbs or error-5xx.hbs
    templateList.unshift('error-' + errorCode[0] + 'xx');

    // Add statusCode specific template: E.g. error-404.hbs
    templateList.unshift('error-' + errorCode);

    return templateList;
};

/**
 * @description Get Template Hierarchy
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
templates.getEntriesTemplateHierarchy = function getEntriesTemplateHierarchy(routerOptions, requestOptions) {
    const templateList = ['index'];

    // CASE: author, tag, custom collection name
    if (routerOptions.name && routerOptions.name !== 'index') {
        templateList.unshift(routerOptions.name);

        if (routerOptions.slugTemplate && requestOptions.slugParam) {
            templateList.unshift(routerOptions.name + '-' + requestOptions.slugParam);
        }
    }

    // CASE: collections/channels can define a template list
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
 * @description Get Entry Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this request.
 * 'post' is the default / fallback
 * For posts: [post-:slug, custom-*, post]
 * For pages: [page-:slug, custom-*, page, post]
 *
 * @param {Object} postObject
 * @returns {String[]}
 */
templates.getEntryTemplateHierarchy = function getEntryTemplateHierarchy(postObject, context) {
    const templateList = ['post'];
    let slugTemplate = 'post-' + postObject.slug;

    if (context === 'page') {
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
 * @description Pick Template
 *
 * Taking the ordered list of allowed templates for this request
 * Cycle through and find the first one which has a match in the theme
 *
 * @param {Array|String} templateList
 * @param {string} fallback - a fallback template
 */
templates.pickTemplate = function pickTemplate(templateList, fallback) {
    let template;

    if (!_.isArray(templateList)) {
        templateList = [templateList];
    }

    if (!themeEngine.getActive()) {
        template = fallback;
    } else {
        template = _.find(templateList, function (templateName) {
            if (!templateName) {
                return;
            }

            return themeEngine.getActive().hasTemplate(templateName);
        });
    }

    if (!template) {
        if (!fallback) {
            template = 'index';
        } else if (_.isFunction(fallback)) {
            fallback();
        } else {
            template = fallback;
        }
    }

    return template;
};

/**
 *
 * @param {Object} entry
 * @param {('post'|'page')} context
 * @returns
 */
templates.getTemplateForEntry = function getTemplateForEntry(entry, context) {
    const templateList = templates.getEntryTemplateHierarchy(entry, context);
    const fallback = templateList[templateList.length - 1];
    return templates.pickTemplate(templateList, fallback);
};

templates.getTemplateForEntries = function getTemplateForEntries(routerOptions, requestOptions) {
    const templateList = templates.getEntriesTemplateHierarchy(routerOptions, requestOptions);
    const fallback = templateList[templateList.length - 1];
    return templates.pickTemplate(templateList, fallback);
};

templates.getTemplateForError = function getTemplateForError(statusCode) {
    const templateList = templates.getErrorTemplateHierarchy(statusCode);
    const fallback = path.resolve(config.get('paths').defaultViews, 'error.hbs');
    return templates.pickTemplate(templateList, fallback);
};

/**
 * @description Set template for express. Express will render the template you set here.
 * @param {Object} req
 * @param {Object} res
 * @param {Object} data
 */
templates.setTemplate = function setTemplate(req, res, data) {
    if (res._template && !req.err) {
        return;
    }

    if (req.err) {
        res._template = templates.getTemplateForError(res.statusCode);
        return;
    }

    if (['channel', 'collection'].indexOf(res.routerOptions.type) !== -1) {
        res._template = templates.getTemplateForEntries(res.routerOptions, {
            path: url.parse(req.url).pathname,
            page: req.params.page,
            slugParam: req.params.slug
        });
    } else if (res.routerOptions.type === 'custom') {
        res._template = templates.pickTemplate(res.routerOptions.templates, res.routerOptions.defaultTemplate);
    } else if (res.routerOptions.type === 'entry') {
        if (res.routerOptions?.context?.includes('page') || (res.routerOptions?.context?.includes('preview') && data.page)) {
            res._template = templates.getTemplateForEntry(data.page, 'page');
        } else {
            res._template = templates.getTemplateForEntry(data.post, 'post');
        }
    } else {
        res._template = 'index';
    }
};

module.exports = templates;
