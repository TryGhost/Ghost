/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/ghost_foot.js @ 407e032dc7 — transforms: imports→seam
// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
import {blogIcon, settingsCache, urlUtils} from '../seam/proxy.ts';
import {SafeString, hbs, templates} from '../seam/handlebars-env.ts';
import _ from '../utils/lodash.ts';

const createFrame = hbs.handlebars.createFrame;

// We use the name ghost_foot to match the helper for consistency:
export default function ghost_foot(options: any) { // eslint-disable-line camelcase
    const foot: any[] = [];

    const globalCodeinjection = settingsCache.get('codeinjection_foot');
    const postCodeinjection = options.data.root && options.data.root.post ? options.data.root.post.codeinjection_foot : null;
    const tagCodeinjection = options.data.root && options.data.root.tag ? options.data.root.tag.codeinjection_foot : null;

    if (!_.isEmpty(globalCodeinjection)) {
        foot.push(globalCodeinjection);
    }

    if (!_.isEmpty(postCodeinjection)) {
        foot.push(postCodeinjection);
    }

    if (!_.isEmpty(tagCodeinjection)) {
        foot.push(tagCodeinjection);
    }

    // Reader-side gift toast. `_giftLink` is set on res.locals by the entry
    // controller only on a verified gift render, so it shows on gift reads and
    // never on canonical URLs. Overridable: a theme can supply its own
    // `partials/gift-toast.hbs`.
    if (options.data.root._giftLink) {
        const data = createFrame(options.data);
        const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');

        // Brand the toast's media panel with the publication icon — it's square,
        // so it fills the 64px cover-fit cell cleanly (the logo isn't, and would
        // crop badly). When no icon is set the partial paints the gift-card
        // pattern from these long-cached texture assets instead.
        data.giftToast = {
            accentColor: settingsCache.get('accent_color') || '#15171a',
            brandUrl: blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            orbUrl: `${siteUrl}/gift/assets/gift-card-orb.png`,
            noiseUrl: `${siteUrl}/gift/assets/gift-card-noise.png`
        };

        // Execute with the post as context so the partial, and any theme
        // override of it, gets the full post scope.
        foot.push(templates.execute('gift-toast', options.data.root.post, {data}));
    }

    return new SafeString(foot.join(' ').trim());
}
