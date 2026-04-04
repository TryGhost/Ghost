const _ = require('lodash');
const BaseMapGenerator = require('./base-site-map-generator');

class TagsMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'tags';
        _.extend(this, opts);
    }
}

module.exports = TagsMapGenerator;
