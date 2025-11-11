const should = require('should'); // eslint-disable-line no-unused-vars
const sinon = require('sinon');
const rewire = require('rewire');

describe('Member Welcome Emails - mail-context', function () {
    let mailContext;
    let emailAddressService;
    let GhostMailerStub;
    let db;
    let queryBuilder;
    let mailerInstance;

    beforeEach(function () {
        mailContext = rewire('../../../../../core/server/services/member-welcome-emails/jobs/lib/mail-context');

        emailAddressService = {init: sinon.stub()};
        mailerInstance = {send: sinon.stub()};
        GhostMailerStub = sinon.stub().returns(mailerInstance);

        mailContext.__set__('emailAddressService', emailAddressService);
        mailContext.__set__('mail', {GhostMailer: GhostMailerStub});

        queryBuilder = {
            whereIn: sinon.stub().returnsThis(),
            select: sinon.stub().resolves([
                {key: 'title', value: 'My Site'},
                {key: 'accent_color', value: '#abcdef'},
                {key: 'url', value: 'https://example.com'}
            ])
        };

        db = {
            knex: sinon.stub().withArgs('settings').returns(queryBuilder)
        };

        mailContext.__set__('MAIL_CONFIG', {
            initialized: false,
            mailer: null,
            siteSettings: {}
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('initializes the mailer and caches site settings', async function () {
        const config = await mailContext.ensureInitialized({db});

        sinon.assert.calledOnce(emailAddressService.init);
        sinon.assert.calledOnce(GhostMailerStub);
        sinon.assert.calledWithExactly(db.knex, 'settings');
        sinon.assert.calledWithExactly(queryBuilder.whereIn, 'key', ['title', 'accent_color', 'url']);

        config.siteSettings.should.eql({
            title: 'My Site',
            url: 'https://example.com',
            accentColor: '#abcdef'
        });
        config.mailer.should.equal(mailerInstance);
    });

    it('reuses cached config after the first initialization', async function () {
        await mailContext.ensureInitialized({db});
        await mailContext.ensureInitialized({db});

        sinon.assert.calledOnce(emailAddressService.init);
        sinon.assert.calledOnce(GhostMailerStub);
        sinon.assert.calledOnce(db.knex);
        sinon.assert.calledOnce(queryBuilder.select);
    });

    it('throws if getConfig is called before initialization', function () {
        mailContext.__set__('MAIL_CONFIG', {
            initialized: false,
            mailer: null,
            siteSettings: {}
        });

        (() => mailContext.getConfig()).should.throw('Mail context has not been initialized');
    });
});
