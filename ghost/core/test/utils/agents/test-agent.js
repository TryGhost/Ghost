const Agent = require('@tryghost/express-test');

/**
 * @constructor
 * @param {Object} app  Ghost express app instance
 * @param {Object} options
 * @param {String} options.apiURL
 * @param {String} options.originURL
 */
class TestAgent extends Agent {
    constructor(app, options) {
        super(app, {
            baseUrl: options.apiURL,
            headers: {
                host: options.originURL.replace(/http:\/\//, ''),
                origin: options.originURL
            },
            queryParams: options.queryParams
        });
    }
}

module.exports = TestAgent;
