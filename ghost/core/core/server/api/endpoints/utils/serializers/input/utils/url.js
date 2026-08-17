const urlUtils = require('../../../../../../../shared/url-utils').default;
const urlService = require('../../../../../../services/url');
const localUtils = require('../../../index');

const handleImageUrl = (imageUrl) => {
    try {
        const imageURL = new URL(imageUrl, urlUtils.getSiteUrl());
        const siteURL = new URL(urlUtils.getSiteUrl());
        const subdir = siteURL.pathname.replace(/\/$/, '');
        const imagePathRe = new RegExp(`${subdir}/${urlUtils.STATIC_IMAGE_URL_PREFIX}`);

        if (imagePathRe.test(imageURL.pathname)) {
            return urlUtils.relativeToAbsolute(imageUrl);
        }

        return imageUrl;
    } catch (e) {
        return imageUrl;
    }
};

const forPost = (attrs, options) => {
    if (options && options.withRelated) {
        options.withRelated.forEach((relation) => {
            if (relation === 'tags' && attrs.tags) {
                attrs.tags = attrs.tags.map(tag => forTag(tag));
            }

            if (relation === 'author' && attrs.author) {
                attrs.author = forUser(attrs.author);
            }

            if (relation === 'authors' && attrs.authors) {
                attrs.authors = attrs.authors.map(author => forUser(author));
            }
        });
    }

    return attrs;
};

const forUser = (attrs) => {
    if (attrs.profile_image) {
        attrs.profile_image = handleImageUrl(attrs.profile_image);
    }

    if (attrs.cover_image) {
        attrs.cover_image = handleImageUrl(attrs.cover_image);
    }

    return attrs;
};

const forTag = (attrs) => {
    if (attrs.feature_image) {
        attrs.feature_image = handleImageUrl(attrs.feature_image);
    }

    return attrs;
};

const forSetting = (attrs) => {
    if (attrs.value && ['cover_image', 'logo', 'icon', 'portal_button_icon', 'og_image', 'twitter_image', 'pintura_js_url', 'pintura_css_url'].includes(attrs.key)) {
        attrs.value = urlUtils.relativeToAbsolute(attrs.value);
    }

    return attrs;
};

// A `?fields=url` query strips the columns the lazy URL service needs to
// build a URL (e.g. status/visibility/slug), so the service would reject the
// resource as thin. Force them back into the fetch and record them on the
// frame — the output mapper strips them from the response after the URL is
// built. No-op when the routing config needs no extra columns.
const forceUrlColumns = (frame, routerType, extraColumns = []) => {
    if (!Array.isArray(frame.options.columns) || !frame.options.columns.includes('url')) {
        return;
    }
    const required = new Set([...urlService.getRequiredFields(routerType), ...extraColumns]);
    const missing = [...required].filter(field => !frame.options.columns.includes(field));
    if (!missing.length) {
        return;
    }
    // A read already carries the fields it was looked up by: `findOne` forges
    // the model with them before the fetch, so they survive a narrowed
    // `?fields=` list and the caller is served them today. Stripping those back
    // out would take a field away — `posts/slug/:slug/?fields=url` still
    // answers with its slug. They are still selected, because the lookup
    // matches case-insensitively: the forged value can differ in case from the
    // stored one, and the URL is built from whichever the model carries.
    const carried = Object.keys(frame.data || {});
    const forced = missing.filter(field => !carried.includes(field));
    if (forced.length) {
        frame.forcedUrlColumns = {routerType, columns: forced};
    }
    frame.options.columns.push(...missing);
};

// `url` is serialized for every post/page unless `?fields` narrows it away,
// so the relations the lazy URL service reads (e.g. tags for a tag-filtered
// collection) must be loaded whenever the URL will be built — not only for
// the `?fields=url` case. Forced relations are recorded on the frame for the
// output mapper to strip. No-op when the routing config reads no relations.
const forceUrlRelations = (frame, routerType) => {
    if (!localUtils.willSerializeUrl(frame)) {
        return;
    }
    const relations = urlService.getRequiredRelations();
    if (relations.length) {
        const requested = frame.options.withRelated || [];
        // a nested include covers its parent: `authors.roles` loads authors
        const covers = (requestedRelation, relation) => {
            return requestedRelation === relation || requestedRelation.startsWith(`${relation}.`);
        };
        const forced = relations.filter(relation => !requested.some(requestedRelation => covers(requestedRelation, relation)));
        if (forced.length) {
            frame.forcedUrlRelations = forced;
            frame.options.withRelated = [...requested, ...forced];
        }
    }
    // The URL is looked up by `model.id`, and Bookshelf matches eager-loaded
    // rows back to their parent by the same key — so a `?fields=` list that
    // omits it serializes /404/ and leaves the relations above unattached,
    // silently and without a key on the model at all. A read looked up by id
    // is covered by the carried-fields rule above.
    forceUrlColumns(frame, routerType, ['id']);
};

// Options-object variant of forceUrlColumns for endpoints that build
// their query options directly (search index).
const requiredUrlColumns = (routerType, columns) => {
    const required = urlService.getRequiredFields(routerType).filter(field => !columns.includes(field));
    return required.length ? [...columns, ...required] : columns;
};

module.exports.forPost = forPost;
module.exports.requiredUrlColumns = requiredUrlColumns;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forSetting = forSetting;
module.exports.forceUrlColumns = forceUrlColumns;
module.exports.forceUrlRelations = forceUrlRelations;
