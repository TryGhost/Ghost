const SearchIndexService = require('./SearchIndexService');
const PostsService = require('../posts/posts-service')();
const models = require('../../models');

module.exports = new SearchIndexService({
    PostsService,
    models
});
