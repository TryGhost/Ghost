const _ = require('lodash');
const validator = require('@tryghost/validator');
const BaseMapGenerator = require('./base-site-map-generator');

class UserMapGenerator extends BaseMapGenerator {
    constructor(opts) {
        super();

        this.name = 'authors';
        _.extend(this, opts);
    }

    validateImageUrl(imageUrl) {
        /** @type {Partial<Parameters<typeof validator.isURL>[0]>} */
        const isUrlOptions = {
            protocols: ['http', 'https'],
            require_protocol: true
        };
        return (
            typeof imageUrl === 'string' &&
            (
                // `validator.isURL` doesn't let us express "any TLD or localhost", so we do two checks.
                validator.isURL(imageUrl, isUrlOptions) ||
                validator.isURL(imageUrl, {...isUrlOptions, host_whitelist: ['localhost']})
            )
        );
    }
}

module.exports = UserMapGenerator;
