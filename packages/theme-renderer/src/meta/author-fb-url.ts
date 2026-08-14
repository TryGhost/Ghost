/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/author-fb-url.js @ 407e032dc7 — transforms: imports→seam
import getContextObject from './context-object.ts';
import _ from 'lodash';

function getAuthorFacebookUrl(data: any) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.facebook) {
        return contextObject.primary_author.facebook;
    } else if (_.includes(context, 'author') && contextObject.facebook) {
        return contextObject.facebook;
    }
    return null;
}

export default getAuthorFacebookUrl;
