/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/author-image.js @ 407e032dc7 — transforms: imports→seam
import {urlUtils} from '../seam/proxy.ts';
import getContextObject from './context-object.ts';
import _ from '../utils/lodash.ts';

function getAuthorImage(data: any, absolute?: boolean) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.profile_image) {
        return urlUtils.urlFor('image', {image: contextObject.primary_author.profile_image}, absolute);
    }
    return null;
}

export default getAuthorImage;
