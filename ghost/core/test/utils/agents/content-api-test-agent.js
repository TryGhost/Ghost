const TestAgent = require('./test-agent');
const DataGenerator = require('../fixtures/data-generator');

const defaultContentAPISecretKey = DataGenerator.Content.api_keys[1].secret;

/**
 * @constructor
 * @param {Object} app  Ghost express app instance
 * @param {Object} options
 * @param {String} options.apiURL
 * @param {String} options.originURL
 */
class ContentAPITestAgent extends TestAgent {
    constructor(app, options) {
        super(app, options);
    }

    async authenticateWithKey(key) {
        this.defaults.queryParams = {
            key
        };
    }

    /**
     *
     * @description Authenticate with default content api keys
     */
    authenticate() {
        return this.authenticateWithKey(defaultContentAPISecretKey);
    }
}

module.exports = ContentAPITestAgent;
