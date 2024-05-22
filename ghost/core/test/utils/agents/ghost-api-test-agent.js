const TestAgent = require('./test-agent');

/**
 * NOTE: this class is not doing much at the moment. It's rather a placeholder to test
 * any Ghost API specific functionality, like /.well-known. If there is none in the nearest
 * future, it would make sense to remove it alltogether.
 * @constructor
 * @param {Object} app  Ghost express app instance
 * @param {Object} options
 * @param {String} options.apiURL
 * @param {String} options.originURL
 */
class GhostAPITestAgent extends TestAgent {
    constructor(app, options) {
        super(app, options);
    }
}

module.exports = GhostAPITestAgent;
