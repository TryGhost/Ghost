const tag = (attrs) => {
    // Already deleted in model.toJSON, but leaving here so that we can clean that up when we deprecate v0.1
    delete attrs.parent_id;

    // Extra properties removed from v2
    delete attrs.parent;
    delete attrs.created_at;
    delete attrs.updated_at;

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

    return attrs;
};

const post = (attrs) => {
    // Extra properties removed from v2
    delete attrs.locale;
    delete attrs.author;

    // @TODO: https://github.com/TryGhost/Ghost/issues/10335
    // delete attrs.page;
    delete attrs.status;

    return attrs;
};

module.exports.post = post;
module.exports.tag = tag;
module.exports.author = author;
