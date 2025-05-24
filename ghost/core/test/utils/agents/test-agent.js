const Agent = require('@tryghost/express-test');
let defaultOptions;

/**
 * @constructor
 * @param {Object} app  Ghost express app instance
 * @param {Object} options
 * @param {String} options.apiURL
 * @param {String} options.originURL
 */
class TestAgent extends Agent {
    constructor(app, options) {
        defaultOptions = {
            baseUrl: options.apiURL,
            headers: {
                host: options.originURL.replace(/http:\/\//, ''),
                origin: options.originURL
            },
            queryParams: options.queryParams
        };
        super(app, {...defaultOptions});
    }

    restoreDefaults() {
        console.log('this.defaults before', this.defaults);
        this.defaults = defaultOptions;
        console.log('this.defaults after', this.defaults);
    }
}

module.exports = TestAgent;
