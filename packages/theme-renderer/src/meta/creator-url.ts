/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/creator-url.js @ 407e032dc7 — transforms: imports→seam
import getContextObject from './context-object.ts';
import _ from 'lodash';

function getCreatorTwitterUrl(data: any) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.twitter) {
        return contextObject.primary_author.twitter;
    } else if (_.includes(context, 'author') && contextObject.twitter) {
        return contextObject.twitter;
    }
    return null;
}

export default getCreatorTwitterUrl;
