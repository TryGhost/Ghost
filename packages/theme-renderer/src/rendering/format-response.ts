/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/rendering/format-response.js @ 407e032dc7 —
// transforms: CJS → ESM; `hbs` (theme-engine/engine) local-template-options
// calls → the pure functions in ./template-options.ts (identical behavior:
// they only read/write `locals._templateOptions`).
import _ from '../utils/lodash.ts';
import {getLocalTemplateOptions, updateLocalTemplateOptions} from './template-options.ts';
import {prepareContextResource} from '../seam/proxy.ts';
import {checks} from '../seam/data.ts';

const {isPage} = checks;

/**
 * @description Formats API response into handlebars/theme format.
 *
 * @return {Object} containing page variables
 */
function formatPageResponse(result: any, pageAsPost = false, locals: any = {}) {
    const response: any = {};

    if (result.posts) {
        response.posts = result.posts;
        prepareContextResource(response.posts);
    }

    if (result.meta && result.meta.pagination) {
        response.pagination = result.meta.pagination;
    }

    // when a custom routed page is loaded it can have an associated page object,
    // in that case we want to make sure @page is still available and matches the
    // selected page properties
    if (isPage(result.data?.page?.[0])) {
        const page = result.data?.page?.[0];

        // build up @page data for use in templates
        // - done here rather than `update-local-template-options` middleware because
        //   we need access to the rendered entry's data which isn't available in middleware
        const pageData = {
            show_title_and_feature_image: page.show_title_and_feature_image
        };

        // merge @page into local template options
        const localTemplateOptions = getLocalTemplateOptions(locals);
        updateLocalTemplateOptions(locals, _.merge({}, localTemplateOptions, {
            data: {
                page: pageData
            }
        }));
    }

    _.each(result.data, function (data: any, name: string) {
        prepareContextResource(data);

        if (data.meta) {
            // Move pagination to be a top level key
            response[name] = data;
            response[name].pagination = data.meta.pagination;
            delete response[name].meta;
        } else {
            // This is a single object, don't wrap it in an array
            response[name] = data[0];
        }
    });

    if (pageAsPost && response.page) {
        response.post = response.page;
    }

    return response;
}

/**
 * @description Format a single resource for handlebars.
 *
 * @TODO
 * In the future, we should return {page: entry} or {post:entry).
 * But for now, we would break the themes if we just change it.
 *
 * @see https://github.com/TryGhost/Ghost/issues/10042.
 *
 * @return {Object} containing page variables
 */
function formatResponse(post: any, context?: string[], locals: any = {}) {
    // build up @page data for use in templates
    // - done here rather than `update-local-template-options` middleware because
    //   we need access to the rendered entry's data which isn't available in middleware
    const pageData = {
        show_title_and_feature_image: true // default behaviour
    };

    // grab data off of the post that will be deleted in prepareContextResource
    const showTitleAndFeatureImage = post.show_title_and_feature_image;

    prepareContextResource(post);

    const entry: any = {
        post: post
    };

    // NOTE: preview context is a special case where the internal preview api returns the post model's type field
    if (context?.includes('page') || (context?.includes('preview') && post.type === 'page')) {
        entry.page = post;

        // move properties from the page context object onto @page
        // - makes the value available outside of the page context
        // - data is removed from the post object in prepareContextResource so use of @page is forced
        if (showTitleAndFeatureImage !== undefined) {
            pageData.show_title_and_feature_image = showTitleAndFeatureImage;
        }
    }

    // merge @page into local template options
    const localTemplateOptions = getLocalTemplateOptions(locals);
    updateLocalTemplateOptions(locals, _.merge({}, localTemplateOptions, {
        data: {
            page: pageData
        }
    }));

    return entry;
}

export default {
    entries: formatPageResponse,
    entry: formatResponse
};
