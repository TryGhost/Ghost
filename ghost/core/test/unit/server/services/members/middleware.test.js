const assert = require('node:assert/strict');
const crypto = require('crypto');
const sinon = require('sinon');

const urlUtils = require('../../../../../core/shared/url-utils');
const config = require('../../../../../core/shared/config');
const tiersService = require('../../../../../core/server/services/tiers/service');
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
            sinon.assert.calledOnce(next);
            assert.deepEqual(next.firstCall.args, []);
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], '/blah/?action=signup&success=true');
        });

        it('redirects correctly on failure', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.rejects();

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], '/blah/?action=signup&success=false');
        });

        it('appends errorCode to the redirect when the rejection has a string code', async function () {
            req.url = '/members?token=test&action=subscribe';
            req.query = {token: 'test', action: 'subscribe'};

            const err = new Error('This gift has expired.');
            err.code = 'GIFT_EXPIRED';
            membersService.ssr.exchangeTokenForSession.rejects(err);

            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], '/blah/?action=subscribe&errorCode=GIFT_EXPIRED&success=false');
        });

        it('does not append errorCode when the rejection has no code', async function () {
            req.url = '/members?token=test&action=subscribe';
            req.query = {token: 'test', action: 'subscribe'};

            membersService.ssr.exchangeTokenForSession.rejects(new Error('boom'));

            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], '/blah/?action=subscribe&success=false');
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], 'https://custom.com/redirect/');
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
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], 'https://custom.com/paid/');
        });

        it('redirects member to referrer param path on signin if it is on the site', async function () {
            req.url = '/members?token=test&action=signin&r=https%3A%2F%2Fsite.com%2Fblah%2Fmy-post%2F';
            req.query = {token: 'test', action: 'signin', r: 'https://site.com/blah/my-post/#comment-123'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], 'https://site.com/blah/my-post/?action=signin&success=true#comment-123');
        });

        it('redirects member to referrer param path on signup if it is on the site', async function () {
            req.url = '/members?token=test&action=signup&r=https%3A%2F%2Fsite.com%2Fblah%2Fmy-post%2F';
            req.query = {token: 'test', action: 'signup', r: 'https://site.com/blah/my-post/#comment-123'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], 'https://site.com/blah/my-post/?action=signup&success=true#comment-123');
        });

        it('redirects member to referrer param path on failure if it is on the site', async function () {
            req.url = '/members?token=test&action=subscribe&r=https%3A%2F%2Fsite.com%2Fblah%2F';
            req.query = {
                token: 'test',
                action: 'subscribe',
                r: 'https://site.com/blah/#/portal/account?giftRedemption=true'
            };

            membersService.ssr.exchangeTokenForSession.rejects();

            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], 'https://site.com/blah/?action=subscribe&success=false#/portal/account?giftRedemption=true');
        });

        it('does not redirect to referrer param if it is external', async function () {
            req.url = '/members?token=test&action=signin&r=https%3A%2F%2Fexternal.com%2Fwhatever%2F';
            req.query = {token: 'test', action: 'signin', r: 'https://external.com/whatever/'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves({});

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behavior
            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.firstCall.args[0], '/blah/?action=signin&success=true');
        });
    });

    describe('updateMemberNewsletters', function () {
        // let oldMembersService;
        let req;
        let res;

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
            sinon.assert.calledOnce(res.writeHead);
            assert.equal(res.writeHead.firstCall.args[0], 404);
            sinon.assert.calledOnce(res.end);
            assert.equal(res.end.firstCall.args[0], 'Email address not found.');
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
            sinon.assert.calledOnce(res.writeHead);
            assert.equal(res.writeHead.firstCall.args[0], 404);
            sinon.assert.calledOnce(res.end);
            assert.equal(res.end.firstCall.args[0], 'Email address not found.');
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
            sinon.assert.calledOnce(res.json);
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
            sinon.assert.calledOnce(res.writeHead);
            assert.equal(res.writeHead.firstCall.args[0], 400);
            sinon.assert.calledOnce(res.end);
            assert.equal(res.end.firstCall.args[0], 'Failed to update newsletters');
        });
    });

    describe('setAccessCookies (via accessInfoSession)', function () {
        // setAccessCookies is a private function called via onHeaders inside
        // accessInfoSession. We test it here by triggering the onHeaders
        // callback through res.writeHead(), which is how on-headers works.

        let req;
        let res;
        let next;
        const hmacSecret = crypto.randomBytes(64).toString('base64');
        const freeTierId = '000000000000000000000001';

        let originalTiersApi;

        beforeEach(function () {
            req = {headers: {}, member: null};
            res = {
                _headers: {},
                getHeader: sinon.stub().returns([]),
                setHeader: sinon.stub(),
                writeHead: function (statusCode) {
                    this.statusCode = statusCode;
                }
            };
            next = sinon.stub();

            // tiersService.api is null until init() runs; assign a mock directly
            originalTiersApi = tiersService.api;
            tiersService.api = /** @type {any} */ ({
                browse: sinon.stub().resolves({
                    data: [{id: freeTierId, type: 'free'}]
                })
            });

            sinon.stub(config, 'get')
                .withArgs('cacheMembersContent:hmacSecret').returns(hmacSecret)
                .withArgs('cacheMembersContent:enabled').returns(true);
        });

        afterEach(function () {
            tiersService.api = originalTiersApi;
            sinon.restore();
        });

        async function runAndFlushHeaders(member) {
            req.member = member;
            await membersMiddleware.accessInfoSession(req, res, next);
            // Trigger onHeaders callbacks by calling writeHead
            res.writeHead(200);
        }

        it('uses Path=/ for root site installs', async function () {
            sinon.stub(urlUtils, 'getSubdir').returns('');

            const member = {
                subscriptions: [{status: 'active', tier: {id: freeTierId}}]
            };
            await runAndFlushHeaders(member);

            const setCookieArgs = res.setHeader.args.find(args => args[0] === 'Set-Cookie');
            assert.ok(setCookieArgs, 'Set-Cookie header should be set');
            const cookies = setCookieArgs[1];
            const accessCookie = cookies.find(c => c.startsWith('ghost-access='));
            const hmacCookie = cookies.find(c => c.startsWith('ghost-access-hmac='));
            assert.ok(accessCookie, 'ghost-access cookie should be set');
            assert.ok(hmacCookie, 'ghost-access-hmac cookie should be set');
            assert.ok(accessCookie.includes('Path=/;'), `Expected Path=/ in ghost-access: ${accessCookie}`);
            assert.ok(hmacCookie.includes('Path=/;'), `Expected Path=/ in ghost-access-hmac: ${hmacCookie}`);
        });

        it('uses Path=/subdir for subdirectory site installs', async function () {
            sinon.stub(urlUtils, 'getSubdir').returns('/subdir');

            const member = {
                subscriptions: [{status: 'active', tier: {id: freeTierId}}]
            };
            await runAndFlushHeaders(member);

            const setCookieArgs = res.setHeader.args.find(args => args[0] === 'Set-Cookie');
            assert.ok(setCookieArgs, 'Set-Cookie header should be set');
            const cookies = setCookieArgs[1];
            const accessCookie = cookies.find(c => c.startsWith('ghost-access='));
            const hmacCookie = cookies.find(c => c.startsWith('ghost-access-hmac='));
            assert.ok(accessCookie, 'ghost-access cookie should be set');
            assert.ok(hmacCookie, 'ghost-access-hmac cookie should be set');
            assert.ok(accessCookie.includes('Path=/subdir;'), `Expected Path=/subdir in ghost-access: ${accessCookie}`);
            assert.ok(hmacCookie.includes('Path=/subdir;'), `Expected Path=/subdir in ghost-access-hmac: ${hmacCookie}`);
        });

        it('clears cookies with Path=/ for root site installs', async function () {
            sinon.stub(urlUtils, 'getSubdir').returns('');
            req.headers.cookie = 'ghost-access=stale';

            await runAndFlushHeaders(null);

            const setCookieArgs = res.setHeader.args.find(args => args[0] === 'Set-Cookie');
            assert.ok(setCookieArgs, 'Set-Cookie header should be set');
            const cookies = setCookieArgs[1];
            const accessCookie = cookies.find(c => c.startsWith('ghost-access='));
            const hmacCookie = cookies.find(c => c.startsWith('ghost-access-hmac='));
            assert.ok(accessCookie, 'ghost-access cookie should be set');
            assert.ok(hmacCookie, 'ghost-access-hmac cookie should be set');
            assert.match(accessCookie, /^ghost-access=null;.*Path=\/;/, `Expected null with Path=/ in ghost-access: ${accessCookie}`);
            assert.match(hmacCookie, /^ghost-access-hmac=null;.*Path=\/;/, `Expected null with Path=/ in ghost-access-hmac: ${hmacCookie}`);
        });

        it('clears cookies with Path=/subdir for subdirectory site installs', async function () {
            sinon.stub(urlUtils, 'getSubdir').returns('/subdir');
            req.headers.cookie = 'ghost-access=stale';

            await runAndFlushHeaders(null);

            const setCookieArgs = res.setHeader.args.find(args => args[0] === 'Set-Cookie');
            assert.ok(setCookieArgs, 'Set-Cookie header should be set');
            const cookies = setCookieArgs[1];
            const accessCookie = cookies.find(c => c.startsWith('ghost-access='));
            const hmacCookie = cookies.find(c => c.startsWith('ghost-access-hmac='));
            assert.ok(accessCookie, 'ghost-access cookie should be set');
            assert.ok(hmacCookie, 'ghost-access-hmac cookie should be set');
            assert.match(accessCookie, /^ghost-access=null;.*Path=\/subdir;/, `Expected null with Path=/subdir in ghost-access: ${accessCookie}`);
            assert.match(hmacCookie, /^ghost-access-hmac=null;.*Path=\/subdir;/, `Expected null with Path=/subdir in ghost-access-hmac: ${hmacCookie}`);
        });
    });
});
