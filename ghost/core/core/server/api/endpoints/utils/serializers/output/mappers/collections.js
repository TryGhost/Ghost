/**
 *
 * @param {import('@tryghost/collections').Collection | object} collection
 *
 * @returns {SerializedCollection}
 */
const mapper = (collection, frame) => {
    let json;
    if (collection.toJSON) {
        json = collection.toJSON();
    } else {
        json = collection;
    }

    const serialized = {
        id: json.id,
        title: json.title || null,
        slug: json.slug,
        description: json.description || null,
        type: json.type,
        filter: json.filter,
        feature_image: json.feature_image || json.featureImage || null,
        created_at: (json.created_at || json.createdAt).toISOString().replace(/\d{3}Z$/, '000Z'),
        updated_at: (json.updated_at || json.updatedAt).toISOString().replace(/\d{3}Z$/, '000Z')
    };

    if (frame?.options?.withRelated?.includes('count.posts')) {
        serialized.count = {
            posts: json.posts.length
        };
    }

    return serialized;
};

module.exports = mapper;

/**
 * @typedef {Object} SerializedCollection
 * @prop {string} id
 * @prop {string} title
 * @prop {string} slug
 * @prop {string} description
 * @prop {string} type
 * @prop {string} filter
 * @prop {string} feature_image
 * @prop {string} created_at
 * @prop {string} updated_at
 */
