const assert = require('assert');
const sinon = require('sinon');
const APIVersionCompatibilityService = require('../index');

describe('APIVersionCompatibilityService', function () {
    const getSiteUrl = () => 'https://amazeballsghostsite.com';
    const getSiteTitle = () => 'Tahini and chickpeas';

    afterEach(function () {
        sinon.reset();
    });

    it('Sends an email to the instance owners when fresh accept-version header mismatch detected', async function () {
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.spy();
        const saveHandled = sinon.spy();

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchEmailsToNotify: async () => ['test_env@example.com'],
            fetchHandled,
            saveHandled,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'test_env@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:test_env@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to test_env@example.com/);
    });

    it('Does NOT send an email to the instance owner when previously handled accept-version header mismatch is detected', async function () {
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.stub()
            .onFirstCall().resolves(null)
            .onSecondCall().resolves({});

        const saveHandled = sinon.stub().resolves({});

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchEmailsToNotify: async () => ['test_env@example.com'],
            fetchHandled,
            saveHandled,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'test_env@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:test_env@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to test_env@example.com/);

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.calledTwice, false);
    });

    it('Does send multiple emails to the instance owners when previously unhandled accept-version header mismatch is detected', async function () {
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.stub()
            .onFirstCall().resolves(null)
            .onSecondCall().resolves(null);

        const saveHandled = sinon.stub().resolves({});

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchEmailsToNotify: async () => ['test_env@example.com', 'test_env2@example.com'],
            fetchHandled,
            saveHandled,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.calledTwice, true);
        assert.equal(sendEmail.args[0][0].to, 'test_env@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:test_env@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to test_env@example.com/);

        assert.equal(sendEmail.calledTwice, true);
        assert.equal(sendEmail.args[1][0].to, 'test_env2@example.com');
        assert.equal(sendEmail.args[1][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[1][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[1][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[1][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);

        assert.match(sendEmail.args[1][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[1][0].html, /to <a href="mailto:test_env2@example.com"/);

        assert.match(sendEmail.args[1][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[1][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[1][0].text, /Current Ghost version:v5.1/);

        assert.match(sendEmail.args[1][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[1][0].text, /to test_env2@example.com/);

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.8',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox'
        });

        assert.equal(sendEmail.callCount, 4);
        assert.equal(sendEmail.args[2][0].to, 'test_env@example.com');

        assert.match(sendEmail.args[2][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[2][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.8/);
        assert.match(sendEmail.args[2][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[2][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[2][0].text, /Elaborate Fox integration expected Ghost version:v4.8/);
        assert.match(sendEmail.args[2][0].text, /Current Ghost version:v5.1/);
    });

    it('Trims down the name of the integration when a lot of meta information is present in user-agent header', async function (){
        const sendEmail = sinon.spy();
        const fetchHandled = sinon.spy();
        const saveHandled = sinon.spy();

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            fetchEmailsToNotify: async () => ['test_env@example.com'],
            fetchHandled,
            saveHandled,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Fancy Pants/2.3 GhostAdminSDK/2.4.0'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'test_env@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Fancy Pants integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Fancy Pants<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Fancy Pants integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:test_env@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Fancy Pants is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Fancy Pants integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to test_env@example.com/);
    });
});
