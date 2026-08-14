// Copied from ghost/core/core/frontend/services/helpers/register-ghost-helpers.js @ 407e032dc7 —
// transforms: CJS requires → static ESM imports; singleton registry → injected
// HelperRegistrar; trimmed to the Tier-2 helper set this package ships
// (extraction-map §(a)) — the omitted registrations are listed in
// docs/provenance.md.
import {createHelperRegistry} from './registry.ts';
import type {HelperRegistrar} from '../../seam/types.ts';

import asset from '../asset.ts';
import authors from '../authors.ts';
import bodyClass from '../body-class.ts';
import concat from '../concat.ts';
import content from '../content.ts';
import date from '../date.ts';
import encode from '../encode.ts';
import excerpt from '../excerpt.ts';
import foreach from '../foreach.ts';
import get from '../get.ts';
import ghostFoot from '../ghost-foot.ts';
import ghostHead from '../ghost-head.ts';
import has from '../has.ts';
import imgUrl from '../img-url.ts';
import is from '../is.ts';
import link from '../link.ts';
import linkClass from '../link-class.ts';
import match from '../match.ts';
import metaDescription from '../meta-description.ts';
import metaTitle from '../meta-title.ts';
import navigation from '../navigation.ts';
import pageUrl from '../page-url.ts';
import pagination from '../pagination.ts';
import plural from '../plural.ts';
import postClass from '../post-class.ts';
import prevPost from '../prev-post.ts';
import raw from '../raw.ts';
import readingTime from '../reading-time.ts';
import t from '../t.ts';
import tags from '../tags.ts';
import tiers from '../tiers.ts';
import title from '../title.ts';
import url from '../url.ts';

export const registerGhostHelpers = (registrar: HelperRegistrar): void => {
    const registry = createHelperRegistry(registrar);
    registry.registerHelper('asset', asset);
    registry.registerHelper('authors', authors);
    registry.registerHelper('body_class', bodyClass);
    registry.registerHelper('concat', concat);
    registry.registerHelper('content', content);
    registry.registerHelper('date', date);
    registry.registerHelper('encode', encode);
    registry.registerHelper('excerpt', excerpt);
    registry.registerHelper('foreach', foreach);
    registry.registerHelper('get', get);
    registry.registerHelper('ghost_foot', ghostFoot);
    registry.registerHelper('ghost_head', ghostHead);
    registry.registerHelper('has', has);
    registry.registerHelper('img_url', imgUrl);
    registry.registerHelper('is', is);
    registry.registerHelper('link_class', linkClass);
    registry.registerHelper('link', link);
    registry.registerHelper('match', match);
    registry.registerHelper('meta_description', metaDescription);
    registry.registerHelper('meta_title', metaTitle);
    registry.registerHelper('navigation', navigation);
    registry.registerHelper('page_url', pageUrl);
    registry.registerHelper('pagination', pagination);
    registry.registerHelper('plural', plural);
    registry.registerHelper('post_class', postClass);
    registry.registerHelper('prev_post', prevPost);
    registry.registerHelper('raw', raw);
    registry.registerHelper('reading_time', readingTime);
    registry.registerHelper('t', t);
    registry.registerHelper('tags', tags);
    registry.registerHelper('tiers', tiers);
    registry.registerHelper('title', title);
    registry.registerHelper('url', url);
};
