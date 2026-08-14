/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/keywords.js @ 407e032dc7 — transforms: imports→seam
import helpers from '@tryghost/helpers';

const ghostHelperUtils = helpers.utils;

function getKeywords(data: any) {
    if (data.post && data.post.tags && data.post.tags.length > 0) {
        return ghostHelperUtils.visibility.filter(data.post.tags, ['public'], function processItem(item: any) {
            return item.name;
        });
    }
    return null;
}

export default getKeywords;
