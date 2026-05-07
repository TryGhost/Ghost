const assert = require('node:assert').strict;
const express = require('express');
const request = require('supertest');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/config-utils');

const frontendCaching = require('../../../../../core/frontend/web/middleware/frontend-caching');

const cacheMembersContentConfigKey = 'cacheMembersContent:enabled';

describe('frontendCaching', function () {
    let freeTier;
    let premiumTier;

    this.beforeEach(async function () {
        freeTier = {id: 'freeTierId'};
        premiumTier = {id: 'premiumTierId'};
    });

    this.afterEach(async function () {
        await configUtils.restore();
    });

    async function requestWithFrontendCaching({path = '/', member, isPrivateBlog} = {}) {
        const app = express();
        const middleware = await frontendCaching.getMiddleware(async () => freeTier);

        app.use((req, res, next) => {
            req.member = member;
            res.isPrivateBlog = isPrivateBlog;
            next();
        });
        app.use(middleware);
        app.use((req, res) => {
            res.sendStatus(204);
        });

        return request(app)
            .get(path)
            .expect(204);
    }

    it('should set cache control to private if the blog is private', async function () {
        const {headers} = await requestWithFrontendCaching({isPrivateBlog: true});
        assert.equal(headers['cache-control'], testUtils.cacheRules.private);
    });

    it('should set cache control to private if the request is made by a member', async function () {
        const {headers} = await requestWithFrontendCaching({member: true});
        assert.equal(headers['cache-control'], testUtils.cacheRules.private);
    });

    it('should set cache control to public if the site is public and the request is not made by a member', async function () {
        const {headers} = await requestWithFrontendCaching();
        assert.equal(headers['cache-control'], testUtils.cacheRules.public);
    });

    it('should set cache control to public if the request is made by a member and caching members content is enabled', async function () {
        configUtils.set(cacheMembersContentConfigKey, true);

        const {headers} = await requestWithFrontendCaching({
            member: {
                subscriptions: []
            }
        });
        assert.equal(headers['cache-control'], testUtils.cacheRules.public);
        assert.equal(headers['x-member-cache-tier'], 'freeTierId');
    });

    it('should set cache control to no-cache if the path starts with /p/', async function () {
        const {headers} = await requestWithFrontendCaching({path: '/p/test'});
        assert.equal(headers['cache-control'], testUtils.cacheRules.noCache);
    });

    it('should set cache control to private if the member has more than one active subscription', async function () {
        configUtils.set(cacheMembersContentConfigKey, true);

        const {headers} = await requestWithFrontendCaching({
            member: {
                subscriptions: [{status: 'active'}, {status: 'active'}]
            }
        });
        assert.equal(headers['cache-control'], testUtils.cacheRules.private);
        assert.equal(headers['x-member-cache-tier'], undefined);
    });

    it('should set cache control to public for the member tier if the member has one active subscription', async function () {
        configUtils.set(cacheMembersContentConfigKey, true);

        const {headers} = await requestWithFrontendCaching({
            member: {
                subscriptions: [{status: 'active', tier: premiumTier}]
            }
        });
        assert.equal(headers['cache-control'], testUtils.cacheRules.public);
        assert.equal(headers['x-member-cache-tier'], 'premiumTierId');
    });

    it('should set cache control to public for the free tier if the member has no active subscriptions', async function () {
        configUtils.set(cacheMembersContentConfigKey, true);

        const {headers} = await requestWithFrontendCaching({
            member: {
                subscriptions: []
            }
        });
        assert.equal(headers['cache-control'], testUtils.cacheRules.public);
        assert.equal(headers['x-member-cache-tier'], 'freeTierId');
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
