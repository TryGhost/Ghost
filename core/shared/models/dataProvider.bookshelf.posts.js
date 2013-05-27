(function () {
    "use strict";

    var util = require('util'),
        models = require('./models'),
        BaseProvider = require('./dataProvider.bookshelf.base'),
        PostsProvider;

    /**
     * The Posts data provider implementation for Bookshelf.
     */
    PostsProvider = function () {
        BaseProvider.call(this, models.Post, models.Posts);
    };

    util.inherits(PostsProvider, BaseProvider);

    module.exports = PostsProvider;
}());