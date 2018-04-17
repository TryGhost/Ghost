'use strict';

const _  = require('lodash'),
    urlService = require('../../../services/url'),
    BaseMapGenerator = require('./base-generator');

class PageMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'pages';

        _.extend(this, opts);
        this.addUrl(urlService.utils.urlFor('home', true), {slug: 'name'});
    }

    /**
     * @TODO:
     * We could influence this with priority or meta information
     */
    getPriorityForDatum(page) {
        return page && page.name === 'home' ? 1.0 : 0.8;
    }
}

module.exports = PageMapGenerator;
