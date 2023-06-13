const collectionPostsMapper = require('./mappers/collection-posts');

module.exports = {
    browsePosts(response, apiConfig, frame) {
        frame.response = {
            collection_posts: response.data.map(model => collectionPostsMapper(model)),
            meta: response.meta
        };
    }
};
