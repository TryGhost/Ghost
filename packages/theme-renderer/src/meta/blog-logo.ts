/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/blog-logo.js @ 407e032dc7 — transforms: imports→seam
import {blogIcon, settingsCache, urlUtils} from '../seam/proxy.ts';

function getBlogLogo() {
    const logo: any = {};

    if (settingsCache.get('logo')) {
        logo.url = urlUtils.urlFor('image', {image: settingsCache.get('logo')}, true);
    } else {
        // CASE: no publication logo is updated. We can try to use either an uploaded publication icon
        // or use the default one to make
        // Google happy with it. See https://github.com/TryGhost/Ghost/issues/7558
        logo.url = blogIcon.getIconUrl({absolute: true});
    }

    return logo;
}

export default getBlogLogo;
