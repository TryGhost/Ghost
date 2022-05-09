const assert = require('assert');
const sinon = require('sinon');
const APIVersionCompatibilityService = require('../index');

describe('APIVersionCompatibilityService', function () {
    const getSiteUrl = () => 'https://amazeballsghostsite.com';
    const getSiteTitle = () => 'Tahini and chickpeas';
    let UserModel;
    let settingsService;

    beforeEach(function () {
        UserModel = {
            findAll: sinon
                .stub()
                .withArgs({
                    withRelated: ['roles'],
                    filter: 'status:active'
                }, {
                    internal: true
                })
                .resolves({
                    toJSON: () => [{
                        email: 'simon@example.com',
                        roles: [{
                            name: 'Administrator'
                        }]
                    }]
                })
        };
        settingsService = {
            read: sinon.stub().resolves({
                version_notifications: {
                    value: JSON.stringify([
                        'v3.4',
                        'v4.1'
                    ])
                }
            }),
            edit: sinon.stub().resolves()
        };
    });

    afterEach(function () {
        sinon.reset();
    });

    it('Sends an email to the instance owners when fresh accept-version header mismatch detected', async function () {
        const sendEmail = sinon.spy();
        const compatibilityService = new APIVersionCompatibilityService({
            UserModel,
            settingsService,
            sendEmail,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox',
            requestURL: 'https://amazeballsghostsite.com/ghost/api/admin/posts/dew023d9203se4'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'simon@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[0][0].html, /Failed request URL:<\/strong>&nbsp; https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:simon@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);
        assert.match(sendEmail.args[0][0].text, /Failed request URL:/);
        assert.match(sendEmail.args[0][0].text, /https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to simon@example.com/);
    });

    it('Does NOT send an email to the instance owner when previously handled accept-version header mismatch is detected', async function () {
        const sendEmail = sinon.spy();
        settingsService = {
            read: sinon.stub()
                .onFirstCall().resolves({
                    version_notifications: {
                        value: JSON.stringify([])
                    }
                })
                .onSecondCall().resolves({
                    version_notifications: {
                        value: JSON.stringify([])
                    }
                })
                .onThirdCall().resolves({
                    version_notifications: {
                        value: JSON.stringify([
                            'v4.5'
                        ])
                    }
                }),
            edit: sinon.stub().resolves()
        };

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            UserModel,
            settingsService,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox',
            requestURL: 'https://amazeballsghostsite.com/ghost/api/admin/posts/dew023d9203se4'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'simon@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[0][0].html, /Failed request URL:<\/strong>&nbsp; https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:simon@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);
        assert.match(sendEmail.args[0][0].text, /Failed request URL:/);
        assert.match(sendEmail.args[0][0].text, /https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to simon@example.com/);

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox',
            requestURL: 'does not matter'
        });

        assert.equal(sendEmail.calledOnce, true);
        assert.equal(sendEmail.calledTwice, false);
    });

    it('Does send multiple emails to the instance owners when previously unhandled accept-version header mismatch is detected', async function () {
        const sendEmail = sinon.spy();
        UserModel = {
            findAll: sinon
                .stub()
                .withArgs({
                    withRelated: ['roles'],
                    filter: 'status:active'
                }, {
                    internal: true
                })
                .resolves({
                    toJSON: () => [{
                        email: 'simon@example.com',
                        roles: [{
                            name: 'Administrator'
                        }]
                    }, {
                        email: 'sam@example.com',
                        roles: [{
                            name: 'Owner'
                        }]
                    }]
                })
        };
        settingsService = {
            read: sinon.stub()
                .onCall(0).resolves({
                    version_notifications: {
                        value: JSON.stringify([])
                    }
                })
                .onCall(1).resolves({
                    version_notifications: {
                        value: JSON.stringify([])
                    }
                })
                .onCall(2).resolves({
                    version_notifications: {
                        value: JSON.stringify([
                            'v4.5'
                        ])
                    }
                })
                .onCall(3).resolves({
                    version_notifications: {
                        value: JSON.stringify([
                            'v4.5'
                        ])
                    }
                }),
            edit: sinon.stub().resolves()
        };

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            UserModel,
            settingsService,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox',
            requestURL: 'https://amazeballsghostsite.com/ghost/api/admin/posts/dew023d9203se4'
        });

        assert.equal(sendEmail.calledTwice, true);
        assert.equal(sendEmail.args[0][0].to, 'simon@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[0][0].html, /Failed request URL:<\/strong>&nbsp; https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:simon@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);
        assert.match(sendEmail.args[0][0].text, /Failed request URL:/);
        assert.match(sendEmail.args[0][0].text, /https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to simon@example.com/);

        assert.equal(sendEmail.calledTwice, true);
        assert.equal(sendEmail.args[1][0].to, 'sam@example.com');
        assert.equal(sendEmail.args[1][0].subject, `Attention required: Your Elaborate Fox integration has failed`);

        assert.match(sendEmail.args[1][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[1][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[1][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[1][0].html, /Failed request URL:<\/strong>&nbsp; https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[1][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[1][0].html, /to <a href="mailto:sam@example.com"/);

        assert.match(sendEmail.args[1][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[1][0].text, /Elaborate Fox integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[1][0].text, /Current Ghost version:v5.1/);
        assert.match(sendEmail.args[1][0].text, /Failed request URL:/);
        assert.match(sendEmail.args[1][0].text, /https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[1][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[1][0].text, /to sam@example.com/);

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.8',
            contentVersion: 'v5.1',
            userAgent: 'Elaborate Fox',
            requestURL: 'https://amazeballsghostsite.com/ghost/api/admin/posts/dew023d9203se4'
        });

        assert.equal(sendEmail.callCount, 4);
        assert.equal(sendEmail.args[2][0].to, 'simon@example.com');

        assert.match(sendEmail.args[2][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Elaborate Fox<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[2][0].html, /Elaborate Fox integration expected Ghost version:<\/strong>&nbsp; v4.8/);
        assert.match(sendEmail.args[2][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[2][0].html, /Failed request URL:<\/strong>&nbsp; https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[2][0].text, /Ghost has noticed that your Elaborate Fox is no longer working as expected\./);
        assert.match(sendEmail.args[2][0].text, /Elaborate Fox integration expected Ghost version:v4.8/);
        assert.match(sendEmail.args[2][0].text, /Current Ghost version:v5.1/);
        assert.match(sendEmail.args[2][0].text, /Failed request URL:/);
        assert.match(sendEmail.args[2][0].text, /https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);
    });

    it('Trims down the name of the integration when a lot of meta information is present in user-agent header', async function (){
        const sendEmail = sinon.spy();

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            UserModel,
            settingsService,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Fancy Pants/2.3 GhostAdminSDK/2.4.0',
            requestURL: 'https://amazeballsghostsite.com/ghost/api/admin/posts/dew023d9203se4'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'simon@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: Your Fancy Pants integration has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that your <strong style="font-weight: 600;">Fancy Pants<\/strong> is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].html, /Fancy Pants integration expected Ghost version:<\/strong>&nbsp; v4.5/);
        assert.match(sendEmail.args[0][0].html, /Current Ghost version:<\/strong>&nbsp; v5.1/);
        assert.match(sendEmail.args[0][0].html, /Failed request URL:<\/strong>&nbsp; https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:simon@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that your Fancy Pants is no longer working as expected\./);
        assert.match(sendEmail.args[0][0].text, /Fancy Pants integration expected Ghost version:v4.5/);
        assert.match(sendEmail.args[0][0].text, /Current Ghost version:v5.1/);
        assert.match(sendEmail.args[0][0].text, /Failed request URL:/);
        assert.match(sendEmail.args[0][0].text, /https:\/\/amazeballsghostsite.com\/ghost\/api\/admin\/posts\/dew023d9203se4/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to simon@example.com/);
    });

    it('Sends Zapier-specific email when userAgent is a Zapier client', async function (){
        const sendEmail = sinon.spy();

        const compatibilityService = new APIVersionCompatibilityService({
            sendEmail,
            UserModel,
            settingsService,
            getSiteUrl,
            getSiteTitle
        });

        await compatibilityService.handleMismatch({
            acceptVersion: 'v4.5',
            contentVersion: 'v5.1',
            userAgent: 'Zapier/4.20 GhostAdminSDK/2.4.0',
            requestURL: 'https://amazeballsghostsite.com/ghost/api/admin/posts/dew023d9203se4'
        });

        assert.equal(sendEmail.called, true);
        assert.equal(sendEmail.args[0][0].to, 'simon@example.com');
        assert.equal(sendEmail.args[0][0].subject, `Attention required: One of your Zaps has failed`);

        assert.match(sendEmail.args[0][0].html, /Ghost has noticed that one of the Zaps in your Zapier integration has <span style="font-weight: 600;">stopped working<\/span>\./);
        assert.match(sendEmail.args[0][0].html, /To get this resolved as quickly as possible, please log in to your Zapier account to view any failing Zaps and recreate them using the most recent Ghost-supported versions. Zap errors can be found <a href="https:\/\/zapier.com\/app\/history\/usage" style="color: #738A94;">here<\/a> in your “Zap history”\./);

        assert.match(sendEmail.args[0][0].html, /This email was sent from <a href="https:\/\/amazeballsghostsite.com"/);
        assert.match(sendEmail.args[0][0].html, /to <a href="mailto:simon@example.com"/);

        assert.match(sendEmail.args[0][0].text, /Ghost has noticed that one of the Zaps in your Zapier integration has stopped/);
        assert.match(sendEmail.args[0][0].text, /To get this resolved as quickly as possible, please log in to your Zapier/);

        assert.match(sendEmail.args[0][0].text, /This email was sent from https:\/\/amazeballsghostsite.com/);
        assert.match(sendEmail.args[0][0].text, /to simon@example.com/);
    });
});
