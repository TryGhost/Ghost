const SearchIndexService = require('./SearchIndexService');
const PostsService = require('../posts/posts-service')();

module.exports = new SearchIndexService({
    PostsService
});
