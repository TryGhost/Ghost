const nock = require('nock');
const assert = require('assert');
const {snapshotManager} = require('@tryghost/jest-snapshot');

// NOTE: this is a shameless copy-pasta from express-test utils.
//       needs to get refactored into reusable package, just like this whole module
const makeMessageFromMatchMessage = (message, errorMessage) => {
    const messageLines = message.split('\n');
    messageLines.splice(0, 1, errorMessage);
    return messageLines.join('\n');
};

class WebhookMockReceiver {
    constructor() {
        this.bodyResponse;
        this.receiver;
        this.recordBodyResponse = this.recordBodyResponse.bind(this);
    }

    recordBodyResponse(body) {
        this.bodyResponse = {body};

        // let the nock continue with the response
        return true;
    }

    mock() {
        this.receiver = nock('https://test-webhook-receiver.com')
            .post('/webhook', this.recordBodyResponse)
            .reply(200, {status: 'OK'});

        return this;
    }

    reset() {
        nock.restore();
        this.bodyResponse = undefined;
    }


    _assertSnapshot(response, assertion) {
        const {properties, field, error} = assertion;

        if (!response[field]) {
            error.message = `Unable to match snapshot on undefined field ${field} ${error.contextString}`;
            error.expected = field;
            error.actual = 'undefined';
            assert.notEqual(response[field], undefined, error);
        }

        const hint = `[${field}]`;
        const match = snapshotManager.match(response[field], properties, hint);

        Object.keys(properties).forEach((prop) => {
            const errorMessage = `"response.${field}" is missing the expected property "${prop}"`;
            error.message = makeMessageFromMatchMessage(match.message(), errorMessage);
            error.expected = prop;
            error.actual = 'undefined';
            error.showDiff = false; // Disable mocha's diff output as it's already present in match.message()

            assert.notEqual(response[field][prop], undefined, error);
        });

        if (match.pass !== true) {
            const errorMessage = `"response.${field}" does not match snapshot.`;
            error.message = makeMessageFromMatchMessage(match.message(), errorMessage);
            error.expected = match.expected;
            error.actual = match.actual;
            error.showDiff = false; // Disable mocha's diff output as it's already present in match.message()
        }

        assert.equal(match.pass, true, error);
    }

    async matchBodySnapshot(properties = {}) {
        while (!this.receiver.isDone()) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        let assertion = {
            fn: this._assertSnapshot,
            properties: properties,
            field: 'body',
            type: 'body'
        };

        this._assertSnapshot(this.bodyResponse, assertion);
    }
}

module.exports = WebhookMockReceiver;
