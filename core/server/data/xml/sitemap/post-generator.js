const _ = require('lodash'),
    BaseMapGenerator = require('./base-generator');

class PostMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'posts';

        _.extend(this, opts);
    }

    getPriorityForDatum(post) {
        // give a slightly higher priority to featured posts
        return post.featured ? 0.9 : 0.8;
    }
}

module.exports = PostMapGenerator;
