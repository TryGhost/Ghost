const should = require('should');
const sinon = require('sinon');

const urlUtils = require('../../../../../core/shared/url-utils');
const membersService = require('../../../../../core/server/services/members');
const membersMiddleware = require('../../../../../core/server/services/members/middleware');
const models = require('../../../../../core/server/models');

describe('Members Service Middleware', function () {
    describe('createSessionFromMagicLink', function () {
        let oldSSR;
        let oldProductModel;
        let req;
        let res;
        let next;

        before(function () {
            models.init();
        });

        beforeEach(function () {
            req = {};
            res = {};
            next = sinon.stub();

            res.redirect = sinon.stub().returns('');

            // Stub the members Service, handle this in separate tests
            oldSSR = membersService.ssr;
            membersService.ssr = {
                exchangeTokenForSession: sinon.stub()
            };

            // Stub the members Service, handle this in separate tests
            oldProductModel = models.Product;
            models.Product = {
                findOne: sinon.stub()
            };

            sinon.stub(urlUtils, 'getSubdir').returns('/blah');
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
        });

        afterEach(function () {
            membersService.ssr = oldSSR;
            models.Product = oldProductModel;
            sinon.restore();
        });

        it('calls next if url does not include a token', async function () {
            req.url = '/members';
            req.query = {};

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.true();
            next.firstCall.args.should.be.an.Array().with.lengthOf(0);
        });

        it('redirects correctly on success', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling success
            membersService.ssr.exchangeTokenForSession.resolves({
                subscriptions: [{
                    status: 'active',
                    tier: {
                        welcome_page_url: ''
                    }
                }]
            });

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
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

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('/blah/?action=signup&success=false');
        });

        it('redirects free member to custom redirect on signup', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Fake welcome page for free tier
            models.Product.findOne.resolves({
                get: () => {
                    return 'https://custom.com/redirect/';
                }
            });

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://custom.com/redirect/');
        });

        it('redirects paid member to custom redirect on signup', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({
                subscriptions: [{
                    status: 'active',
                    tier: {
                        welcome_page_url: 'https://custom.com/paid'
                    }
                }]
            });

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://custom.com/paid/');
        });

        it('redirects member to referrer param path on signup if it is on the site', async function () {
            req.url = '/members?token=test&action=signin&r=https%3A%2F%2Fsite.com%2Fblah%2Fmy-post%2F';
            req.query = {token: 'test', action: 'signin', r: 'https://site.com/blah/my-post/#comment-123'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://site.com/blah/my-post/?success=true&action=signin#comment-123');
        });

        it('does not redirect to referrer param if it is external', async function () {
            req.url = '/members?token=test&action=signin&r=https%3A%2F%2Fexternal.com%2Fwhatever%2F';
            req.query = {token: 'test', action: 'signin', r: 'https://external.com/whatever/'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('/blah/?action=signin&success=true');
        });
    });
});
