const _ = require('lodash');
const validator = require('@tryghost/validator');
const BaseMapGenerator = require('./BaseSiteMapGenerator');

class UserMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'authors';
        _.extend(this, opts);
    }

    validateImageUrl(imageUrl) {
        return imageUrl && validator.isURL(imageUrl, {protocols: ['http', 'https'], require_protocol: true});
    }
}

module.exports = UserMapGenerator;
