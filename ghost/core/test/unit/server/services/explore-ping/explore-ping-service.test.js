const sinon = require('sinon');
const assert = require('node:assert/strict');
const ExplorePingService = require('../../../../../core/server/services/explore-ping/explore-ping-service');

describe('ExplorePingService', function () {
    let explorePingService;
    let settingsCacheStub;
    let configStub;
    let labsStub;
    let loggingStub;
    let ghostVersionStub;
    let requestStub;
    let postsStub;
    let membersStub;
    let statsServiceStub;

    beforeEach(function () {
        // Setup stubs
        settingsCacheStub = {
            get: sinon.stub()
        };

        settingsCacheStub.get.withArgs('site_uuid').returns('123e4567-e89b-12d3-a456-426614174000');
        settingsCacheStub.get.withArgs('active_theme').returns('alto');
        settingsCacheStub.get.withArgs('explore_ping').returns(true);
        settingsCacheStub.get.withArgs('explore_ping_growth').returns(false);
        settingsCacheStub.get.withArgs('facebook').returns('my-profile');
        settingsCacheStub.get.withArgs('twitter').returns('my-handle');
        settingsCacheStub.get.withArgs('stripe_connect_livemode').returns(null);

        configStub = {
            get: sinon.stub()
        };

        configStub.get.withArgs('url').returns('https://example.com');
        configStub.get.withArgs('explore:update_url').returns('https://explore.testing.com');

        labsStub = {
            isSet: sinon.stub().returns(true)
        };

        loggingStub = {
            info: sinon.stub(),
            warn: sinon.stub()
        };

        ghostVersionStub = {
            full: '4.0.0'
        };

        requestStub = sinon.stub();

        postsStub = {
            stats: {
                getTotalPostsPublished: sinon.stub().resolves(100),
                getMostRecentlyPublishedPostDate: sinon.stub().resolves(new Date('2023-01-01')),
                getFirstPublishedPostDate: sinon.stub().resolves(new Date('2020-01-01'))
            }
        };

        membersStub = {
            stats: {
                getTotalMembers: sinon.stub().resolves(50)
            }
        };

        statsServiceStub = {
            api: {
                mrr: {
                    getCurrentMrr: sinon.stub().resolves([
                        {currency: 'usd', mrr: 1000}
                    ])
                }
            }
        };

        explorePingService = new ExplorePingService({
            settingsCache: settingsCacheStub,
            config: configStub,
            labs: labsStub,
            logging: loggingStub,
            ghostVersion: ghostVersionStub,
            request: requestStub,
            posts: postsStub,
            members: membersStub,
            statsService: statsServiceStub
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Payload with default settings', function () {
        it('constructs correct payload', async function () {
            const payload = await explorePingService.constructPayload();

            assert.deepEqual(payload, {
                ghost: '4.0.0',
                site_uuid: '123e4567-e89b-12d3-a456-426614174000',
                url: 'https://example.com',
                theme: 'alto',
                facebook: 'my-profile',
                twitter: 'my-handle',
                posts_total: 100,
                posts_last: '2023-01-01T00:00:00.000Z',
                posts_first: '2020-01-01T00:00:00.000Z'
            });
        });

        it('returns null for post stats if no posts', async function () {
            postsStub.stats.getFirstPublishedPostDate.resolves(null);
            postsStub.stats.getMostRecentlyPublishedPostDate.resolves(null);
            postsStub.stats.getTotalPostsPublished.resolves(null);

            const payload = await explorePingService.constructPayload();
            assert.equal(payload.posts_first, null);
            assert.equal(payload.posts_last, null);
            assert.equal(payload.posts_total, null);
        });

        it('does not include member stats when setting is disabled', async function () {
            // When explore_ping_growth is disabled (default), member stats should not be included
            const payload = await explorePingService.constructPayload();
            assert.equal(payload.members_total, undefined);
            assert.equal(payload.mrr, undefined);
        });
    });

    describe('Payload with growth enabled', function () {
        beforeEach(function () {
            settingsCacheStub.get.withArgs('explore_ping_growth').returns(true);
        });

        it('returns empty mrr array when Stripe is in test mode (livemode is null)', async function () {
            // stripe_connect_livemode is null by default (test mode)
            const payload = await explorePingService.constructPayload();

            assert.deepEqual(payload, {
                ghost: '4.0.0',
                site_uuid: '123e4567-e89b-12d3-a456-426614174000',
                url: 'https://example.com',
                theme: 'alto',
                facebook: 'my-profile',
                twitter: 'my-handle',
                posts_total: 100,
                posts_last: '2023-01-01T00:00:00.000Z',
                posts_first: '2020-01-01T00:00:00.000Z',
                members_total: 50,
                mrr: []
            });
        });

        it('returns empty mrr array when Stripe is in test mode (livemode is false)', async function () {
            settingsCacheStub.get.withArgs('stripe_connect_livemode').returns(false);
            const payload = await explorePingService.constructPayload();

            assert.deepEqual(payload.mrr, []);
            assert.equal(payload.members_total, 50);
        });

        it('returns MRR array by currency when Stripe is in live mode', async function () {
            settingsCacheStub.get.withArgs('stripe_connect_livemode').returns(true);
            const payload = await explorePingService.constructPayload();

            assert.deepEqual(payload, {
                ghost: '4.0.0',
                site_uuid: '123e4567-e89b-12d3-a456-426614174000',
                url: 'https://example.com',
                theme: 'alto',
                facebook: 'my-profile',
                twitter: 'my-handle',
                posts_total: 100,
                posts_last: '2023-01-01T00:00:00.000Z',
                posts_first: '2020-01-01T00:00:00.000Z',
                members_total: 50,
                mrr: [{currency: 'usd', mrr: 1000}]
            });
        });

        it('returns MRR for multiple currencies when Stripe is in live mode', async function () {
            settingsCacheStub.get.withArgs('stripe_connect_livemode').returns(true);
            statsServiceStub.api.mrr.getCurrentMrr.resolves([
                {currency: 'usd', mrr: 1000},
                {currency: 'eur', mrr: 500},
                {currency: 'gbp', mrr: 250}
            ]);

            const payload = await explorePingService.constructPayload();

            assert.deepEqual(payload.mrr, [
                {currency: 'usd', mrr: 1000},
                {currency: 'eur', mrr: 500},
                {currency: 'gbp', mrr: 250}
            ]);
        });

        it('returns null for post stats if getTotalPostsPublished throws an error', async function () {
            postsStub.stats.getTotalPostsPublished.rejects(new Error('Test error'));

            const payload = await explorePingService.constructPayload();
            assert.equal(payload.posts_total, null);
            assert.equal(payload.posts_last, null);
            assert.equal(payload.posts_first, null);
        });

        it('returns null for members_total if getTotalMembers throws an error', async function () {
            membersStub.stats.getTotalMembers.rejects(new Error('Test error'));

            const payload = await explorePingService.constructPayload();
            assert.equal(payload.members_total, null);
            assert.equal(payload.mrr, null);
        });

        it('returns empty mrr array when statsService is not available', async function () {
            explorePingService = new ExplorePingService({
                settingsCache: settingsCacheStub,
                config: configStub,
                labs: labsStub,
                logging: loggingStub,
                ghostVersion: ghostVersionStub,
                request: requestStub,
                posts: postsStub,
                members: membersStub,
                statsService: null
            });
            settingsCacheStub.get.withArgs('stripe_connect_livemode').returns(true);

            const payload = await explorePingService.constructPayload();

            assert.deepEqual(payload.mrr, []);
            assert.equal(payload.members_total, 50);
        });
    });

    describe('makeRequest', function () {
        it('makes request with correct parameters', async function () {
            const payload = {test: 'data'};
            requestStub.resolves({statusCode: 200, statusMessage: 'OK'});

            await explorePingService.makeRequest('https://test.com', payload);

            sinon.assert.calledOnce(requestStub);
            assert.equal(requestStub.firstCall.args[0], 'https://test.com');
            assert.deepEqual(requestStub.firstCall.args[1], {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        });

        it('handles request errors gracefully', async function () {
            requestStub.rejects(new Error('Network error'));

            await explorePingService.makeRequest('https://test.com', {});

            sinon.assert.calledOnce(loggingStub.warn);
            assert.equal(loggingStub.warn.firstCall.args[0], 'Explore Error');
            assert.equal(loggingStub.warn.firstCall.args[1], 'Network error');
        });
    });

    describe('ping', function () {
        it('does not ping if labs flag is not set', async function () {
            labsStub.isSet.returns(false);

            await explorePingService.ping();

            sinon.assert.notCalled(requestStub);
        });

        it('does not ping if explore URL is not set', async function () {
            configStub.get.withArgs('explore:update_url').returns(null);

            await explorePingService.ping();

            sinon.assert.notCalled(requestStub);
            sinon.assert.calledOnce(loggingStub.warn);
            assert.equal(loggingStub.warn.firstCall.args[0], 'Explore URL not set');
        });

        it('does not ping if explore ping is disabled', async function () {
            settingsCacheStub.get.withArgs('explore_ping').returns(false);

            await explorePingService.ping();

            sinon.assert.notCalled(requestStub);
        });

        it('pings with constructed payload when properly configured', async function () {
            requestStub.resolves({statusCode: 200, statusMessage: 'OK'});

            await explorePingService.ping();

            sinon.assert.calledOnce(requestStub);
            assert.equal(requestStub.firstCall.args[0], 'https://explore.testing.com');
            const payload = await explorePingService.constructPayload();
            assert.equal(requestStub.firstCall.args[1].body, JSON.stringify(payload));
        });
    });
});
