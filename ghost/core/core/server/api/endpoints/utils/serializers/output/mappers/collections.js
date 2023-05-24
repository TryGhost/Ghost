/**
 *
 * @param {import('@tryghost/collections').Collection} collection
 *
 * @returns {SerializedCollection}
 */
const mapper = (collection) => {
    const json = collection.toJSON();

    const serialized = {
        id: json.id,
        title: json.title,
        slug: json.slug,
        description: json.description,
        type: json.type,
        filter: json.filter,
        feature_image: json.featureImage,
        created_at: json.createdAt.toISOString().replace(/\d{3}Z$/, '000Z'),
        updated_at: json.updatedAt.toISOString().replace(/\d{3}Z$/, '000Z')
    };

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
