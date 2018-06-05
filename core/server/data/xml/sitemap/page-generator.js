const _  = require('lodash'),
    BaseMapGenerator = require('./base-generator');

class PageMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'pages';

        _.extend(this, opts);
    }

    /**
     * @TODO:
     * We could influence this with priority or meta information
     */
    getPriorityForDatum(page) {
        return page && page.staticRoute ? 1.0 : 0.8;
    }
}

module.exports = PageMapGenerator;
