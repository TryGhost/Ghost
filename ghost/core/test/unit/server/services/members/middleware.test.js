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

        it('redirects member to referrer param path on signin if it is on the site', async function () {
            req.url = '/members?token=test&action=signin&r=https%3A%2F%2Fsite.com%2Fblah%2Fmy-post%2F';
            req.query = {token: 'test', action: 'signin', r: 'https://site.com/blah/my-post/#comment-123'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://site.com/blah/my-post/?action=signin&success=true#comment-123');
        });

        it('redirects member to referrer param path on signup if it is on the site', async function () {
            req.url = '/members?token=test&action=signup&r=https%3A%2F%2Fsite.com%2Fblah%2Fmy-post%2F';
            req.query = {token: 'test', action: 'signup', r: 'https://site.com/blah/my-post/#comment-123'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://site.com/blah/my-post/?action=signup&success=true#comment-123');
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

    describe('updateMemberNewsletters', function () {
        // let oldMembersService;
        let req;
        let res;

        before(function () {
            models.init();
        });

        beforeEach(function () {
            req = {body: {newsletters: [], enable_comment_notifications: null}};
            res = {writeHead: sinon.stub(), end: sinon.stub()};
        });

        afterEach(function () {
            sinon.restore();
        });

        // auth happens prior to this middleware
        it('returns 404 if no member uuid is part of the request', async function () {
            req.query = {};

            // Call the middleware
            await membersMiddleware.updateMemberNewsletters(req, res);

            // Check behavior
            res.writeHead.calledOnce.should.be.true();
            res.writeHead.firstCall.args[0].should.eql(404);
            res.end.calledOnce.should.be.true();
            res.end.firstCall.args[0].should.eql('Email address not found.');
        });

        // auth happens prior to this middleware
        it('returns 404 if member uuid is not found', async function () {
            req.query = {uuid: 'test'};
            sinon.stub(membersService, 'api').get(() => {
                return {
                    members: {
                        get: sinon.stub().resolves()
                    }
                };
            });

            // Call the middleware
            await membersMiddleware.updateMemberNewsletters(req, res);

            // Check behavior
            res.writeHead.calledOnce.should.be.true();
            res.writeHead.firstCall.args[0].should.eql(404);
            res.end.calledOnce.should.be.true();
            res.end.firstCall.args[0].should.eql('Email address not found.');
        });

        it('attempts to update newsletters', async function () {
            res.json = sinon.stub();
            // member data appended if authed via uuid+key or session
            req.member = {
                id: 'test',
                email: 'test@email.com',
                name: 'Test Name',
                newsletters: [],
                enable_comment_notifications: false,
                status: 'free'
            };
            sinon.stub(membersService, 'api').get(() => {
                return {
                    members: {
                        update: sinon.stub().resolves({
                            ...req.member,
                            toJSON: () => JSON.stringify(req.member)
                        })
                    }
                };
            });
            await membersMiddleware.updateMemberNewsletters(req, res);
            // the stubbing of the api is difficult to test with the current design, so we just check that the response is sent
            res.json.calledOnce.should.be.true();
        });

        it('returns 400 on error', async function () {
            // use a malformed request to trigger an error
            // member data appended if authed via uuid+key or session
            req.member = {
                id: undefined,
                email: 'test@email.com',
                name: 'Test Name',
                newsletters: [],
                enable_comment_notifications: false,
                status: 'free'
            };
            sinon.stub(membersService, 'api').get(() => {
                return {
                    members: {
                        update: sinon.stub().rejects(new Error('Test Error'))
                    }
                };
            });
            await membersMiddleware.updateMemberNewsletters(req, res);

            // Check behavior
            res.writeHead.calledOnce.should.be.true();
            res.writeHead.firstCall.args[0].should.eql(400);
            res.end.calledOnce.should.be.true();
            res.end.firstCall.args[0].should.eql('Failed to update newsletters');
        });
    });
});