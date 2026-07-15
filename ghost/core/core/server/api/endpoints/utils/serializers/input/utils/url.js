const urlUtils = require('../../../../../../../shared/url-utils');
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
// built. No-op under the eager service (getRequiredFields → []).
const forceUrlColumnsWhenLazy = (frame, routerType) => {
    if (!Array.isArray(frame.options.columns) || !frame.options.columns.includes('url')) {
        return;
    }
    const forced = urlService.facade.getRequiredFields(routerType).filter(field => !frame.options.columns.includes(field));
    if (forced.length) {
        frame.forcedUrlColumns = forced;
        frame.options.columns.push(...forced);
    }
};

// `url` is serialized for every post/page unless `?fields` narrows it away,
// so the relations the lazy URL service reads (e.g. tags for a tag-filtered
// collection) must be loaded whenever the URL will be built — not only for
// the `?fields=url` case. Forced relations are recorded on the frame for the
// output mapper to strip. No-op under the eager service.
const forceUrlRelationsWhenLazy = (frame, routerType) => {
    if (!localUtils.willSerializeUrl(frame)) {
        return;
    }
    const relations = urlService.facade.getRequiredRelations();
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
    forceUrlColumnsWhenLazy(frame, routerType);
};

module.exports.forPost = forPost;
module.exports.forUser = forUser;
module.exports.forTag = forTag;
module.exports.forSetting = forSetting;
module.exports.forceUrlColumnsWhenLazy = forceUrlColumnsWhenLazy;
module.exports.forceUrlRelationsWhenLazy = forceUrlRelationsWhenLazy;
