/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Template-options plumbing for the render pipeline.
 *
 * - `getLocalTemplateOptions`/`updateLocalTemplateOptions`: copied from
 *   express-hbs lib/hbs.js @ 2.5.0 (they only read/write
 *   `locals._templateOptions`) so format-response and the middleware ports can
 *   operate on locals without holding the engine instance.
 * - `buildGlobalTemplateOptions`: port of
 *   theme-engine/middleware/update-global-template-options.js @ 407e032dc7 —
 *   Express middleware → pure function returning the options object.
 * - `applyLocalTemplateOptions`: port of
 *   theme-engine/middleware/update-local-template-options.js @ 407e032dc7 —
 *   preview handling dropped (no preview requests in the package), member
 *   masking kept.
 */
import _ from 'lodash';
import {settingsCache, customThemeSettingsCache, urlUtils} from '../seam/proxy.ts';
import {labs} from '../seam/shared.ts';
import {getRendererDeps} from '../seam/deps.ts';
import type {RenderLocals} from '../ports.ts';

// from express-hbs lib/hbs.js:getLocalTemplateOptions
export function getLocalTemplateOptions(locals: RenderLocals): Record<string, any> {
    return locals._templateOptions || {};
}

// from express-hbs lib/hbs.js:updateLocalTemplateOptions
export function updateLocalTemplateOptions(locals: RenderLocals, templateOptions: Record<string, any>): void {
    locals._templateOptions = templateOptions;
}

// from update-global-template-options.js:getSiteData
function getSiteData() {
    const siteData = settingsCache.getPublic();

    // theme-only computed property added to @site
    if (settingsCache.get('members_signup_access') === 'none') {
        const escapedUrl = encodeURIComponent(urlUtils.urlFor({relativeUrl: '/rss/'}, true));
        siteData.signup_url = `https://feedly.com/i/subscription/feed/${escapedUrl}`;
    } else {
        siteData.signup_url = '#/portal';
    }

    return siteData;
}

// from update-global-template-options.js:updateGlobalTemplateOptions —
// middleware → pure function; the caller passes the result to
// engine.updateTemplateOptions()
export function buildGlobalTemplateOptions(): {data: Record<string, any>} {
    const activeTheme = getRendererDeps().activeTheme;
    const siteData = getSiteData();
    const labsData = labs.getAll();

    const themeData = {
        posts_per_page: activeTheme?.config('posts_per_page'),
        image_sizes: activeTheme?.config('image_sizes')
    };
    const themeSettingsData = customThemeSettingsCache.getAll();

    return {
        data: {
            site: {
                ...siteData,
                comments_enabled: siteData.comments_enabled !== 'off',
                comments_access: siteData.comments_enabled
            },
            labs: labsData,
            config: themeData,
            custom: themeSettingsData
        }
    };
}

// from update-local-template-options.js:updateLocalTemplateOptions —
// middleware → function over locals; preview.handle() dropped (no preview
// requests reach the package), member masking preserved for when member
// context lands.
export function applyLocalTemplateOptions(locals: RenderLocals, reqMember?: any): void {
    const localTemplateOptions = getLocalTemplateOptions(locals);

    // adjust @site.url for http/https based on the incoming request
    const siteData = {
        url: urlUtils.urlFor('home', {trailingSlash: false}, true),
        admin_url: urlUtils.urlFor('admin', true)
    };

    const member = reqMember ? {
        uuid: reqMember.uuid,
        email: reqMember.email,
        name: reqMember.name,
        firstname: reqMember.name && reqMember.name.split(' ')[0],
        avatar_image: reqMember.avatar_image,
        subscriptions: reqMember.subscriptions && reqMember.subscriptions.map((sub: any) => {
            return Object.assign({}, sub, {
                default_payment_card_last4: sub.default_payment_card_last4 || '****'
            });
        }),
        paid: reqMember.status !== 'free',
        status: reqMember.status
    } : null;

    const enableDeduplication = labs.isSet('getHelperDeduplication');

    updateLocalTemplateOptions(locals, _.merge({}, localTemplateOptions, {
        data: {
            member: member,
            site: siteData,
            ...(enableDeduplication && {_queryCache: new Map()})
        }
    }));
}
