const tag = (attrs) => {
    // Already deleted in model.toJSON, but leaving here so that we can clean that up when we deprecate v0.1
    delete attrs.parent_id;

    // Extra properties removed from v2
    delete attrs.parent;
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

    return attrs;
};

const author = (attrs) => {
    // Already deleted in model.toJSON, but leaving here so that we can clean that up when we deprecate v0.1
    delete attrs.created_at;
    delete attrs.updated_at;
    delete attrs.last_seen;
    delete attrs.status;
    delete attrs.ghost_auth_id;

    // Extra properties removed from v2
    delete attrs.accessibility;
    delete attrs.locale;
    delete attrs.tour;
    delete attrs.visibility;

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

    return attrs;
};

const post = (attrs) => {
    // Extra properties removed from v2
    delete attrs.locale;
    delete attrs.author;

    // @TODO: https://github.com/TryGhost/Ghost/issues/10335
    // delete attrs.page;
    delete attrs.status;
    delete attrs.visibility;

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

    return attrs;
};

module.exports.post = post;
module.exports.tag = tag;
module.exports.author = author;
