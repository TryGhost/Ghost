const assert = require('node:assert').strict;
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/configUtils');

const frontendCaching = require('../../../../../core/frontend/web/middleware/frontend-caching');

const cacheMembersContentConfigKey = 'cacheMembersContent:enabled';

describe('frontendCaching', function () {
    let res;
    let req;
    let next;
    let middleware;
    let freeTier;
    let premiumTier;

    this.beforeEach(async function () {
        res = {
            set: sinon.spy(),
            get: sinon.stub().returns(undefined)
        };
        req = sinon.spy();
        next = sinon.spy();
        freeTier = {id: 'freeTierId'};
        premiumTier = {id: 'premiumTierId'};
        middleware = await frontendCaching.getMiddleware(async () => Promise.resolve(freeTier));
    });

    this.afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('should set cache control to private if the blog is private', function () {
        res.isPrivateBlog = true;
        middleware(req, res, next);
        assert(res.set.calledOnce);
        assert.ok(res.set.calledWith({'Cache-Control': testUtils.cacheRules.private}));
    });

    it('should set cache control to private if the request is made by a member', function () {
        req.member = true;
        middleware(req, res, next);
        assert.ok(res.set.calledOnce);
        assert.ok(res.set.calledWith({'Cache-Control': testUtils.cacheRules.private}));
    });

    it('should set cache control to public if the site is public and the request is not made by a member', function () {
        req.member = undefined;
        res.isPrivateBlog = undefined;
        middleware(req, res, next);
        assert.ok(res.set.calledOnce);
        assert.ok(res.set.calledWith({'Cache-Control': testUtils.cacheRules.public}));
    });

    it('should set cache control to public if the request is made by a member and caching members content is enabled', function () {
        configUtils.set(cacheMembersContentConfigKey, true);
        req.member = {
            subscriptions: []
        };
        res.isPrivateBlog = undefined;
        middleware(req, res, next);
        assert.equal(res.set.callCount, 2);
        assert.ok(res.set.calledWith({'Cache-Control': testUtils.cacheRules.public}));
        assert.ok(res.set.calledWith({'X-Member-Cache-Tier': 'freeTierId'}));
    });

    describe('calculateMemberTier', function () {
        it('should return null if the member has more than one active subscription', function () {
            const member = {
                subscriptions: [{status: 'active'}, {status: 'active'}]
            };
            const memberTier = frontendCaching.calculateMemberTier(member, freeTier);
            assert.equal(memberTier, null);
        });

        it('should return the tier if the member has one active subscription', function () {
            const member = {
                subscriptions: [{status: 'active', tier: premiumTier}]
            };
            const memberTier = frontendCaching.calculateMemberTier(member, freeTier);
            assert.deepEqual(memberTier, premiumTier);
        });

        it('should return free if the member has no active subscriptions', function () {
            const member = {
                subscriptions: []
            };
            const memberTier = frontendCaching.calculateMemberTier(member, freeTier);
            assert.equal(memberTier, freeTier);
        });
    });
});