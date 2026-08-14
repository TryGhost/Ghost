/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
// Copied from ghost/core/core/frontend/helpers/prev_post.js @ 407e032dc7 — transforms: imports→seam
// ### prevNext helper exposes methods for prev_post and next_post - separately defined in helpers index.
//  Example usages
// `{{#prev_post}}<a href ="{{url}}>previous post</a>{{/prev_post}}'
// `{{#next_post}}<a href ="{{url absolute="true">next post</a>{{/next_post}}'
import {api} from '../seam/proxy.ts';
import {hbs} from '../seam/handlebars-env.ts';
import {checks} from '../seam/data.ts';

import {logging} from '../seam/shared.ts';
import tpl from '@tryghost/tpl';
import get from 'lodash/get.js';
import moment from 'moment';

const messages = {
    mustBeCalledAsBlock: 'The {\\{{helperName}}} helper must be called as a block. E.g. {{#{helperName}}}...{{/{helperName}}}'
};

const createFrame = hbs.handlebars.createFrame;

const buildApiOptions = function buildApiOptions(options: any, post: any) {
    const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');
    const slug = post.slug;
    const op = options.name === 'prev_post' ? '<=' : '>';
    const order = options.name === 'prev_post' ? 'desc' : 'asc';

    const apiOptions: any = {
        /**
         * @deprecated: single authors was superceded by multiple authors in Ghost 1.22.0
         */
        include: 'author,authors,tags,tiers',
        order: 'published_at ' + order,
        limit: 1,
        skipPagination: true,
        // This line deliberately uses double quotes because GQL cannot handle either double quotes
        // or escaped singles, see TryGhost/GQL#34
        filter: "slug:-" + slug + "+published_at:" + op + "'" + publishedAt + "'",
        context: {member: options.data.member}
    };

    if (get(options, 'hash.in')) {
        if (options.hash.in === 'primary_tag' && get(post, 'primary_tag.slug')) {
            apiOptions.filter += '+primary_tag:' + post.primary_tag.slug;
        } else if (options.hash.in === 'primary_author' && get(post, 'primary_author.slug')) {
            apiOptions.filter += '+primary_author:' + post.primary_author.slug;
        } else if (options.hash.in === 'author' && get(post, 'author.slug')) {
            apiOptions.filter += '+author:' + post.author.slug;
        }
    }

    return apiOptions;
};

/**
 * @param {*} options
 * @param {*} data
 * @returns {Promise<any>}
 */
const fetch = async function fetch(this: any, options: any, data: any) {
    const self = this;
    const apiOptions = buildApiOptions(options, this);

    try {
        const response = await api.postsPublic.browse(apiOptions);

        const related = response.posts[0];

        if (related) {
            return options.fn(related, {data: data});
        } else {
            return options.inverse(self, {data: data});
        }
    } catch (error: any) {
        logging.error(error);
        data.error = error.message;
        return options.inverse(self, {data: data});
    }
};

// If prevNext method is called without valid post data then we must return a promise, if there is valid post data
// then the promise is handled in the api call.

/**
 * @param {*} options
 * @returns {Promise<any>}
 */
async function prevNext(this: any, options: any) {
    options = options || {};

    const data = createFrame(options.data);
    const context = options.data.root.context;

    // Guard against incorrect usage of the helpers
    if (!options.fn || !options.inverse) {
        data.error = tpl(messages.mustBeCalledAsBlock, {helperName: options.name});
        logging.warn(data.error);
        return;
    }

    if (context.includes('preview')) {
        return options.inverse(this, {data: data});
    }

    // Guard against trying to execute prev/next on pages, or other resources
    if (!checks.isPost(this) || this.page) {
        return options.inverse(this, {data: data});
    }

    // With the guards out of the way, attempt to build the apiOptions, and then fetch the data
    return fetch.call(this, options, data);
}

prevNext.async = true;
prevNext.alias = 'next_post';

export default prevNext;
