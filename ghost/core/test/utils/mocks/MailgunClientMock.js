const ObjectID = require('bson-objectid').default;

class MockMailgunClient {
    getInstance() {
        return {};
    }

    /**
     *
     * @param {Promise<{id}>}
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
