const assert = require('assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const rssAuthMiddleware = require('../../../../../core/server/services/members/rss-auth-middleware');

describe('RSS Auth Middleware', function () {
    let req, res, next, models, settingsCache, logging;

    beforeEach(function () {
        req = {
            query: {},
            member: null
        };

        res = {
            locals: {}
        };

        next = sinon.stub();

        models = {
            Member: {
                findOne: sinon.stub()
            }
        };

        settingsCache = {
            get: sinon.stub()
        };

        logging = {
            info: sinon.stub(),
            error: sinon.stub()
        };

        // Mock the required modules
        const mockModels = require('../../../../../core/server/models');
        sinon.stub(mockModels, 'Member').value(models.Member);

        const mockSettingsCache = require('../../../../../../shared/settings-cache');
        sinon.stub(mockSettingsCache, 'get').value(settingsCache.get);

        const mockLogging = require('@tryghost/logging');
        sinon.stub(mockLogging, 'info').value(logging.info);
        sinon.stub(mockLogging, 'error').value(logging.error);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('authenticateRssFeed', function () {
        it('should allow access when members are not enabled', async function () {
            settingsCache.get.withArgs('members_signup_access').returns('none');

            await rssAuthMiddleware.authenticateRssFeed(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.equal(next.calledWith(), true);
        });

        it('should allow access to public content without token', async function () {
            settingsCache.get.withArgs('members_signup_access').returns('all');
            settingsCache.get.withArgs('default_content_visibility').returns('public');

            await rssAuthMiddleware.authenticateRssFeed(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.equal(next.calledWith(), true);
        });

        it('should require token for private content', async function () {
            settingsCache.get.withArgs('members_signup_access').returns('all');
            settingsCache.get.withArgs('default_content_visibility').returns('members');

            await rssAuthMiddleware.authenticateRssFeed(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.equal(next.args[0][0] instanceof errors.UnauthorizedError, true);
            assert.equal(next.args[0][0].message, 'RSS token is required for private feeds.');
        });

        it('should authenticate member with valid token', async function () {
            settingsCache.get.withArgs('members_signup_access').returns('all');
            settingsCache.get.withArgs('default_content_visibility').returns('members');

            req.query.token = 'valid-token';

            const mockMember = {
                get: sinon.stub(),
                toJSON: sinon.stub().returns({
                    id: 'member-id',
                    email: 'test@example.com',
                    status: 'paid'
                })
            };

            mockMember.get.withArgs('email').returns('test@example.com');
            mockMember.get.withArgs('status').returns('paid');

            models.Member.findOne.withArgs({rss_token: 'valid-token'}).resolves(mockMember);

            await rssAuthMiddleware.authenticateRssFeed(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.equal(next.calledWith(), true);
            assert.deepEqual(req.member, {
                id: 'member-id',
                email: 'test@example.com',
                status: 'paid'
            });
            assert.deepEqual(res.locals.member, req.member);
            assert.equal(logging.info.calledOnce, true);
        });

        it('should reject invalid token', async function () {
            settingsCache.get.withArgs('members_signup_access').returns('all');
            settingsCache.get.withArgs('default_content_visibility').returns('members');

            req.query.token = 'invalid-token';

            models.Member.findOne.withArgs({rss_token: 'invalid-token'}).resolves(null);

            await rssAuthMiddleware.authenticateRssFeed(req, res, next);

            assert.equal(next.calledOnce, true);
            assert.equal(next.args[0][0] instanceof errors.UnauthorizedError, true);
            assert.equal(next.args[0][0].message, 'Invalid RSS token.');
        });
    });

    describe('generateAuthenticatedRssUrl', function () {
        it('should return base URL when no member or token', function () {
            const baseUrl = 'https://example.com/rss/';
            const result = rssAuthMiddleware.generateAuthenticatedRssUrl(baseUrl, null);
            assert.equal(result, baseUrl);
        });

        it('should append token to URL', function () {
            const baseUrl = 'https://example.com/rss/';
            const member = {rss_token: 'test-token'};
            const result = rssAuthMiddleware.generateAuthenticatedRssUrl(baseUrl, member);
            assert.equal(result, 'https://example.com/rss/?token=test-token');
        });
    });
});