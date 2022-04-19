const assert = require('assert');
const sinon = require('sinon');
const APIVersionCompatibilityService = require('../index');

describe('APIVersionCompatibilityService', function () {
    it('Sends an email to the instance owner when fresh accept-version header mismatch detected', async function () {
        const sendEmail = sinon.spy();
        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.called, true);
        assert.match(sendEmail.args[0][0], /Elaborate Fox integration expected Ghost version: v4.5/);
        assert.match(sendEmail.args[0][0], /Current Ghost version: v5.1/);
    });
});
