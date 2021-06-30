const should = require('should');
const sinon = require('sinon');

const urlUtils = require('../../../../core/shared/url-utils');
const membersService = require('../../../../core/server/services/members');
const membersMiddleware = require('../../../../core/server/services/members/middleware');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Members Service Middleware', function () {
    describe('createSessionFromMagicLink', function () {
        let req;
        let res;
        let next;

        beforeEach(function () {
            req = {};
            res = {};
            next = sinon.stub();

            res.redirect = sinon.stub().returns('');

            // Stub the members Service, handle this in separate tests
            membersService.ssr.exchangeTokenForSession = sinon.stub();

            sinon.stub(urlUtils, 'getSubdir').returns('/blah');
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('calls next if url does not include a token', async function () {
            req.url = '/members';
            req.query = {};

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behaviour
            next.calledOnce.should.be.true();
            next.firstCall.args.should.be.an.Array().with.lengthOf(0);
        });

        it('redirects correctly on success', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling success
            membersService.ssr.exchangeTokenForSession.resolves();

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behaviour
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('/blah/?action=signup&success=true');
        });

        it('redirects correctly on failure', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.rejects();

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behaviour
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('/blah/?action=signup&success=false');
        });

        it('redirects to custom redirect on signup', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            sinon.stub(settingsCache, 'get')
                .withArgs('members_free_signup_redirect')
                .returns('https://custom.com/redirect');

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves();

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behaviour
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://custom.com/redirect/');
        });

        it('redirects to custom redirect on signup', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            sinon.stub(settingsCache, 'get')
                .withArgs('members_paid_signup_redirect')
                .returns('https://custom.com/paid');

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({
                subscriptions: [{
                    status: 'active'
                }]
            });

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behaviour
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://custom.com/paid/');
        });
    });
});
