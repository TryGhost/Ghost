const _ = require('lodash');
const BaseMapGenerator = require('./BaseSiteMapGenerator');

class PageMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'pages';

        _.extend(this, opts);
    }
}

module.exports = PageMapGenerator;
