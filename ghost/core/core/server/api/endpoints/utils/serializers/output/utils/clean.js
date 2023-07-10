const _ = require('lodash');
const localUtils = require('../../../index');

const tag = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        delete attrs.created_at;
        delete attrs.updated_at;

        // We are standardising on returning null from the Content API for any empty values
        if (attrs.meta_title === '') {
            attrs.meta_title = null;
        }
        if (attrs.meta_description === '') {
            attrs.meta_description = null;
        }
        if (attrs.description === '') {
            attrs.description = null;
        }
    }

    delete attrs.parent_id;
    delete attrs.parent;

    return attrs;
};

const author = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        delete attrs.created_at;
        delete attrs.updated_at;
        delete attrs.last_seen;
        delete attrs.status;
        delete attrs.email;
        delete attrs.comment_notifications;
        delete attrs.free_member_signup_notification;
        delete attrs.paid_subscription_started_notification;
        delete attrs.paid_subscription_canceled_notification;
        delete attrs.mention_notifications;
        delete attrs.milestone_notifications;

        // @NOTE: used for night shift
        delete attrs.accessibility;

        // Extra properties removed from current API
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
    const columns = frame && frame.options && frame.options.columns || null;
    const fields = frame && frame.original && frame.original.query && frame.original.query.fields || null;

    if (localUtils.isContentAPI(frame)) {
        delete attrs.status;
        delete attrs.email_only;
        delete attrs.newsletter;
        delete attrs.email_segment;

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
        // NOTE: the visibility column has to be always present in Content API response to perform content gating
        if (columns && columns.includes('visibility') && fields && !fields.includes('visibility')) {
            delete attrs.visibility;
        }

        if (fields && !fields.includes('comments')) {
            delete attrs.comments;
        }
    }

    if (columns && columns.includes('email_segment') && fields && !fields.includes('email_segment')) {
        delete attrs.email_segment;
    }

    if (!attrs.tags) {
        delete attrs.primary_tag;
    }

    if (!attrs.authors) {
        delete attrs.primary_author;
    }

    if (attrs.type !== 'page') {
        delete attrs.show_title_and_feature_image;
    }

    delete attrs.locale;
    delete attrs.author;
    delete attrs.type;
    delete attrs.newsletter_id;

    return attrs;
};

const action = (attrs) => {
    if (attrs.actor) {
        if (attrs.actor_type === 'user') {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'profile_image']);
            attrs.actor.image = attrs.actor.profile_image;
            delete attrs.actor.profile_image;
        } else {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'icon_image']);
            attrs.actor.image = attrs.actor.icon_image;
            delete attrs.actor.icon_image;
        }
    }

    if (attrs.resource) {
        // @NOTE: we only support posts right now
        attrs.resource = _.pick(attrs.resource, ['id', 'title', 'slug', 'feature_image', 'name']);
        attrs.resource.image = attrs.resource.feature_image;
        delete attrs.resource.feature_image;
    }
};

module.exports.post = post;
module.exports.tag = tag;
module.exports.author = author;
module.exports.action = action;
