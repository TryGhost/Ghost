const assert = require('assert');
const sinon = require('sinon');
const APIVersionCompatibilityService = require('../index');

describe('APIVersionCompatibilityService', function () {
    afterEach(function () {
        sinon.reset();
    });

    it('Sends an email to the instance owner when fresh accept-version header mismatch detected', async function () {
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.spy();
        const saveHandled = sinon.spy();

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchHandled,
            saveHandled
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

    it('Does NOT send an email to the instance owner when previously handled accept-version header mismatch is detected', async function () {
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.stub()
            .onFirstCall().resolves(null)
            .onSecondCall().resolves({});

        const saveHandled = sinon.stub().resolves({});

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchHandled,
            saveHandled
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.calledOnce, true);
        assert.match(sendEmail.args[0][0], /Elaborate Fox integration expected Ghost version: v4.5/);
        assert.match(sendEmail.args[0][0], /Current Ghost version: v5.1/);

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.calledTwice, false);
    });

    it('Does send multiple emails to the instance owner when previously unhandled accept-version header mismatch is detected', async function () {
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.stub()
            .onFirstCall().resolves(null)
            .onSecondCall().resolves(null);

        const saveHandled = sinon.stub().resolves({});

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchHandled,
            saveHandled
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.calledOnce, true);
        assert.match(sendEmail.args[0][0], /Elaborate Fox integration expected Ghost version: v4.5/);
        assert.match(sendEmail.args[0][0], /Current Ghost version: v5.1/);

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.8',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.calledTwice, true);
        assert.match(sendEmail.args[1][0], /Elaborate Fox integration expected Ghost version: v4.8/);
        assert.match(sendEmail.args[1][0], /Current Ghost version: v5.1/);
    });
});
