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

    /**
     * Reset the authorization header.
     * Authorization header is set when using token authentication.
     * We need to reset the authorization header when logging in with username/password.
     *
     * @returns {void}
     */
    resetAuth() {
        if (this.defaults.headers.Authorization) {
            delete this.defaults.headers.Authorization;
        }
    }
}

module.exports = TestAgent;
