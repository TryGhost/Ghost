const _ = require('lodash');
const BaseMapGenerator = require('./base-generator');

class PostMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'posts';

        _.extend(this, opts);
    }
}

module.exports = PostMapGenerator;
