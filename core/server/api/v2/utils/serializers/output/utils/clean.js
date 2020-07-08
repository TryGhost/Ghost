const _ = require('lodash');
const localUtils = require('../../../index');

const tag = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        const contentAttrs = _.pick(attrs, [
            'description',
            'feature_image',
            'id',
            'meta_description',
            'meta_title',
            'name',
            'slug',
            'url',
            'visibility'
        ]);

        // We are standardising on returning null from the Content API for any empty values
        if (contentAttrs.meta_title === '') {
            contentAttrs.meta_title = null;
        }
        if (contentAttrs.meta_description === '') {
            contentAttrs.meta_description = null;
        }
        if (contentAttrs.description === '') {
            contentAttrs.description = null;
        }
    }

    return _.pick(attrs, [
        'created_at',
        'description',
        'feature_image',
        'id',
        'meta_description',
        'meta_title',
        'name',
        'slug',
        'updated_at',
        'url',
        'visibility'
    ]);
};

const author = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        delete attrs.created_at;
        delete attrs.updated_at;
        delete attrs.last_seen;
        delete attrs.status;
        delete attrs.email;

        // @NOTE: used for night shift
        delete attrs.accessibility;

        // Extra properties removed from v2
        delete attrs.tour;

        // We are standardising on returning null from the Content API for any empty values
        if (attrs.twitter === '') {
            attrs.twitter = null;
        }
        if (attrs.bio === '') {
            attrs.bio = null;
        }
        if (attrs.website === '') {
            attrs.website = null;
        }
        if (attrs.facebook === '') {
            attrs.facebook = null;
        }
        if (attrs.meta_title === '') {
            attrs.meta_title = null;
        }
        if (attrs.meta_description === '') {
            attrs.meta_description = null;
        }
        if (attrs.location === '') {
            attrs.location = null;
        }
    }

    // @NOTE: unused fields
    delete attrs.visibility;
    delete attrs.locale;

    return attrs;
};

const post = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        // @TODO: https://github.com/TryGhost/Ghost/issues/10335
        // delete attrs.page;
        delete attrs.status;

        // We are standardising on returning null from the Content API for any empty values
        if (attrs.twitter_title === '') {
            attrs.twitter_title = null;
        }
        if (attrs.twitter_description === '') {
            attrs.twitter_description = null;
        }
        if (attrs.meta_title === '') {
            attrs.meta_title = null;
        }
        if (attrs.meta_description === '') {
            attrs.meta_description = null;
        }
        if (attrs.og_title === '') {
            attrs.og_title = null;
        }
        if (attrs.og_description === '') {
            attrs.og_description = null;
        }

        delete attrs.visibility;
    } else {
        delete attrs.page;

        if (!attrs.tags) {
            delete attrs.primary_tag;
        }

        if (!attrs.authors) {
            delete attrs.primary_author;
        }
    }

    delete attrs.locale;
    delete attrs.author;
    delete attrs.type;

    return attrs;
};

const action = (attrs) => {
    if (attrs.actor) {
        delete attrs.actor_id;
        delete attrs.resource_id;

        if (attrs.actor_type === 'user') {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'profile_image']);
            attrs.actor.image = attrs.actor.profile_image;
            delete attrs.actor.profile_image;
        } else {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'icon_image']);
            attrs.actor.image = attrs.actor.icon_image;
            delete attrs.actor.icon_image;
        }
    } else if (attrs.resource) {
        delete attrs.actor_id;
        delete attrs.resource_id;

        // @NOTE: we only support posts right now
        attrs.resource = _.pick(attrs.resource, ['id', 'title', 'slug', 'feature_image']);
        attrs.resource.image = attrs.resource.feature_image;
        delete attrs.resource.feature_image;
    }
};

module.exports.post = post;
module.exports.tag = tag;
module.exports.author = author;
module.exports.action = action;
