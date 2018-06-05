const _  = require('lodash'),
    BaseMapGenerator = require('./base-generator');

class TagsMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'tags';
        _.extend(this, opts);
    }

    /**
     * @TODO:
     * We could influence this with priority or meta information
     */
    getPriorityForDatum() {
        return 0.6;
    }
}

module.exports = TagsMapGenerator;
