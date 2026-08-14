/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/cover-image.js @ 407e032dc7 — transforms: imports→seam
import {urlUtils} from '../seam/proxy.ts';
import getContextObject from './context-object.ts';
import _ from 'lodash';

function getCoverImage(data: any) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if (_.includes(context, 'home') || _.includes(context, 'author')) {
        if (contextObject.cover_image) {
            return urlUtils.urlFor('image', {image: contextObject.cover_image}, true);
        }
    } else {
        if (contextObject.feature_image) {
            return urlUtils.urlFor('image', {image: contextObject.feature_image}, true);
        }
    }
    return null;
}

export default getCoverImage;
