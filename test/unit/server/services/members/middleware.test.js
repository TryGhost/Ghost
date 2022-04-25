const should = require('should');
const sinon = require('sinon');
const ghostVersion = require('@tryghost/version');

const urlUtils = require('../../../../../core/shared/url-utils');
const membersService = require('../../../../../core/server/services/members');
const newslettersService = require('../../../../../core/server/services/newsletters');
const membersMiddleware = require('../../../../../core/server/services/members/middleware');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const config = require('../../../../../core/shared/config');

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

            // Check behaviour
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

        it('redirects free member to custom redirect on signup', async function () {
            req.url = '/members?token=test&action=signup';
            req.query = {token: 'test', action: 'signup'};

            // Fake token handling failure
            membersService.ssr.exchangeTokenForSession.resolves();

            // Fake welcome page for free tier
            models.Product.findOne.resolves({
                get: () => {
                    return 'https://custom.com/redirect/';
                }
            });

            // Call the middleware
            await membersMiddleware.createSessionFromMagicLink(req, res, next);

            // Check behaviour
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

            // Check behaviour
            next.calledOnce.should.be.false();
            res.redirect.calledOnce.should.be.true();
            res.redirect.firstCall.args[0].should.eql('https://custom.com/paid/');
        });
    });

    describe('getMemberSiteData', function () {
        let req;
        let res = {};
        let next;

        before(function () {
            models.init();
            sinon.stub(membersService, 'config').get(() => {
                return {
                    isStripeConnected: () => {
                        return true;
                    },
                    getAllowSelfSignup: () => {
                        return true;
                    }
                };
            });
            sinon.stub(membersService, 'api').get(() => {
                return {
                    productRepository: {
                        list: () => {
                            return {
                                data: []
                            };
                        }
                    },
                    getAllowSelfSignup: () => {
                        return true;
                    }
                };
            });
            sinon.stub(newslettersService, 'browse').returns(Promise.resolve([]));
            sinon.stub(urlUtils, 'urlFor').returns('https://example.com');

            sinon.stub(settingsCache, 'get');
            sinon.stub(config, 'get');
            config.get.withArgs('portal:version').returns('1.22');
            settingsCache.get.withArgs('title').returns('Ghost');
            settingsCache.get.withArgs('description').returns('site description');
            settingsCache.get.withArgs('logo').returns('/content/images/site-logo.png');
            settingsCache.get.withArgs('amp').returns(true);
            settingsCache.get.returns('');
        });

        beforeEach(function () {
            req = {};
            res = {
                json: sinon.spy()
            };
            next = sinon.stub();
            sinon.stub(ghostVersion, 'safe').value('4.44');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns site data for portal', async function () {
            await membersMiddleware.getMemberSiteData(req, res);
            res.json.calledWith({
                site: {
                    title: 'Ghost',
                    description: 'site description',
                    logo: '/content/images/site-logo.png',
                    icon: '',
                    accent_color: '',
                    url: 'https://example.com',
                    version: '4.44',
                    portal_version: '1.22',
                    free_price_name: '',
                    free_price_description: '',
                    allow_self_signup: true,
                    members_signup_access: '',
                    is_stripe_configured: true,
                    portal_button: '',
                    portal_name: '',
                    portal_plans: '',
                    portal_button_icon: '',
                    portal_button_signup_text: '',
                    portal_button_style: '',
                    firstpromoter_id: '',
                    members_support_address: 'noreply@example.com',
                    prices: [],
                    products: [],
                    portal_products: ''
                }
            }).should.be.true();
        });
    });
});
