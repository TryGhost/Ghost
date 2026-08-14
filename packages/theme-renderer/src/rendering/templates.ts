/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/rendering/templates.js @ 407e032dc7 —
// transforms: CJS → ESM; Express req/res → ports; `themeEngine.getActive()` →
// `getRendererDeps().activeTheme`; `url.parse(req.url).pathname` → `req.path`
// (same value — our port request carries the pathname without query);
// getTemplateForError's filesystem fallback (config.paths.defaultViews
// error.hbs) → the string 'error' (the package has no default views — the
// assembly returns a plain-text error Response when the theme has no error
// template).
// # Templates
//
// Figure out which template should be used to render a request
// based on the templates which are allowed, and what is available in the theme
import _ from '../utils/lodash.ts';
import {getRendererDeps} from '../seam/deps.ts';
import type {PortRequest, PortResponse, RouterOptions} from '../ports.ts';

const templates: any = {};

/**
 * @description Get Error Template Hierarchy
 *
 * Fetch the ordered list of templates that can be used to render this error statusCode.
 *
 * The default is the
 *
 * @param {number} statusCode
 * @returns {String[]}
 */
templates.getErrorTemplateHierarchy = function getErrorTemplateHierarchy(statusCode: number): string[] {
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
templates.getEntriesTemplateHierarchy = function getEntriesTemplateHierarchy(routerOptions: RouterOptions, requestOptions: any): string[] {
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
        routerOptions.templates.forEach((template: string) => {
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
templates.getEntryTemplateHierarchy = function getEntryTemplateHierarchy(postObject: any, context: string): string[] {
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
templates.pickTemplate = function pickTemplate(templateList: string[] | string, fallback?: string | (() => void)): string | undefined {
    let template;

    if (!_.isArray(templateList)) {
        templateList = [templateList];
    }

    const activeTheme = getRendererDeps().activeTheme;

    if (!activeTheme) {
        template = fallback;
    } else {
        template = _.find(templateList, function (templateName) {
            if (!templateName) {
                return undefined;
            }

            return activeTheme.hasTemplate(templateName);
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

    return template as string | undefined;
};

/**
 *
 * @param {Object} entry
 * @param {('post'|'page')} context
 * @returns
 */
templates.getTemplateForEntry = function getTemplateForEntry(entry: any, context: string) {
    const templateList = templates.getEntryTemplateHierarchy(entry, context);
    const fallback = templateList[templateList.length - 1];
    return templates.pickTemplate(templateList, fallback);
};

templates.getTemplateForEntries = function getTemplateForEntries(routerOptions: RouterOptions, requestOptions: any) {
    const templateList = templates.getEntriesTemplateHierarchy(routerOptions, requestOptions);
    const fallback = templateList[templateList.length - 1];
    return templates.pickTemplate(templateList, fallback);
};

templates.getTemplateForError = function getTemplateForError(statusCode: number) {
    const templateList = templates.getErrorTemplateHierarchy(statusCode);
    // Transform: upstream falls back to config.paths.defaultViews/error.hbs on
    // the filesystem; the package falls back to the theme-relative 'error'.
    const fallback = 'error';
    return templates.pickTemplate(templateList, fallback);
};

/**
 * @description Set template for the render step. The assembly renders the template set here.
 * @param {Object} req
 * @param {Object} res
 * @param {Object} data
 */
templates.setTemplate = function setTemplate(req: PortRequest & {err?: any}, res: PortResponse, data?: any): void {
    if (res._template && !req.err) {
        return;
    }

    if (req.err) {
        res._template = templates.getTemplateForError((res as any).statusCode);
        return;
    }

    if (['channel', 'collection'].indexOf(res.routerOptions.type) !== -1) {
        res._template = templates.getTemplateForEntries(res.routerOptions, {
            path: req.path,
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

export default templates;
