const TestAgent = require('./test-agent');
const DataGenerator = require('./fixtures/data-generator');

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

    async authenticateWithSecret(secret) {
        this.defaults.queryParams = {
            key: secret
        };
    }

    /**
     *
     * @description Authenticate with default content api keys
     */
    authenticate() {
        return this.authenticateWithSecret(defaultContentAPISecretKey);
    }
}

module.exports = ContentAPITestAgent;
