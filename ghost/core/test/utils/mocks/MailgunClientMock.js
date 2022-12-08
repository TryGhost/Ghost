const ObjectID = require('bson-objectid').default;

class MockMailgunClient {
    getInstance() {
        return {};
    }

    /**
     *
     * @returns {Promise<{id: string}>}
     */
    async send() {
        return {
            id: `mailgun-mock-id-${ObjectID().toHexString()}`
        };
    }

    /**
     * Act as if always configured on test environment
     * @returns true
     */
    isConfigured() {
        return true;
    }
}

module.exports = new MockMailgunClient();
