/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/canonical-url.js @ 407e032dc7 — transforms: imports→seam
import _ from 'lodash';
import {urlUtils} from '../seam/proxy.ts';
import getUrl from './url.ts';

function getCanonicalUrl(data: any) {
    if ((_.includes(data.context, 'post') || _.includes(data.context, 'page'))
        && data.post && data.post.canonical_url) {
        return data.post.canonical_url;
    }

    if (_.includes(data.context, 'tag') && data.tag && data.tag.canonical_url) {
        return data.tag.canonical_url;
    }

    return urlUtils.urlJoin(urlUtils.urlFor('home', true), getUrl(data, false));
}

export default getCanonicalUrl;
