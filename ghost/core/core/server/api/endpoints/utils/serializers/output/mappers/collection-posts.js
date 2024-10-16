/**
 *
 * @param {import('@tryghost/collections').CollectionPostListItemDTO[]} collectionPosts[]
 *
 * @returns {SerializedCollectionPost}
 */
const mapper = (collectionPost) => {
    return collectionPost;
};

/**
 * @typedef {Object} SerializedCollectionPost
 * @prop {string} id
 * @prop {string} title
 * @prop {string} slug
 * @prop {string} feature_image
 */

module.exports = mapper;
