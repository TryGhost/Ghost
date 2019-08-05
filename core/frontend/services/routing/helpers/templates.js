// # Templates
//
// Figure out which template should be used to render a request
// based on the templates which are allowed, and what is available in the theme
const _ = require('lodash'),
    path = require('path'),
    url = require('url'),
    config = require('../../../../server/config'),
    themes = require('../../themes'),
    _private = {};

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
_private.getEntriesTemplateHierarchy = function getEntriesTemplateHierarchy(routerOptions, requestOptions) {
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
 * @description Pick Template
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
        } else if (_.isFunction(fallback)) {
            fallback();
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

_private.getTemplateForEntries = function getTemplateForEntries(routerOptions, requestOptions) {
    const templateList = _private.getEntriesTemplateHierarchy(routerOptions, requestOptions),
        fallback = templateList[templateList.length - 1];
    return _private.pickTemplate(templateList, fallback);
};

_private.getTemplateForError = function getTemplateForError(statusCode) {
    const templateList = _private.getErrorTemplateHierarchy(statusCode),
        fallback = path.resolve(config.get('paths').defaultViews, 'error.hbs');
    return _private.pickTemplate(templateList, fallback);
};

/**
 * @description Set template for express. Express will render the template you set here.
 * @param {Object} req
 * @param {Object} res
 * @param {Object} data
 */
module.exports.setTemplate = function setTemplate(req, res, data) {
    if (res._template && !req.err) {
        return;
    }

    if (req.err) {
        res._template = _private.getTemplateForError(res.statusCode);
        return;
    }

    if (['channel', 'collection'].indexOf(res.routerOptions.type) !== -1) {
        res._template = _private.getTemplateForEntries(res.routerOptions, {
            path: url.parse(req.url).pathname,
            page: req.params.page,
            slugParam: req.params.slug
        });
    } else if (res.routerOptions.type === 'custom') {
        res._template = _private.pickTemplate(res.routerOptions.templates, res.routerOptions.defaultTemplate);
    } else if (res.routerOptions.type === 'entry') {
        res._template = _private.getTemplateForEntry(data.post);
    } else {
        res._template = 'index';
    }
};
