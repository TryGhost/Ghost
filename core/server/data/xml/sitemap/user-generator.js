const _ = require('lodash'),
    validator = require('validator'),
    BaseMapGenerator = require('./base-generator');

class UserMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'authors';
        _.extend(this, opts);
    }

    /**
     * @TODO:
     * We could influence this with priority or meta information
     */
    getPriorityForDatum() {
        return 0.6;
    }

    validateImageUrl(imageUrl) {
        return imageUrl && validator.isURL(imageUrl, {protocols: ['http', 'https'], require_protocol: true});
    }
}

module.exports = UserMapGenerator;
