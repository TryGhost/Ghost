const sinon = require('sinon');
const assert = require('assert/strict');
const ExplorePingService = require('../../../../../core/server/services/explore-ping/ExplorePingService');

describe('ExplorePingService', function () {
    let explorePingService;
    let settingsCacheStub;
    let configStub;
    let labsStub;
    let loggingStub;
    let ghostVersionStub;
    let requestStub;

    beforeEach(function () {
        // Setup stubs
        settingsCacheStub = {
            getPublic: sinon.stub().returns({
                title: 'Test Blog',
                description: 'Test Description',
                icon: 'icon.png',
                accent_color: '#000000',
                lang: 'en',
                timezone: 'Etc/UTC',
                navigation: JSON.stringify([]),
                secondary_navigation: JSON.stringify([]),
                meta_title: null,
                meta_description: null,
                og_image: null,
                og_title: null,
                og_description: null,
                twitter_image: null,
                twitter_title: null,
                twitter_description: null,
                active_theme: 'casper',
                cover_image: null,
                logo: null,
                portal_button: true,
                portal_name: true,
                locale: 'en',
                twitter: '@test',
                facebook: 'testfb',
                labs: JSON.stringify({})
            })
        };

        configStub = {
            get: sinon.stub()
        };

        configStub.get.withArgs('url').returns('https://example.com');
        configStub.get.withArgs('explore:url').returns('https://explore-api.ghost.org');

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

        explorePingService = new ExplorePingService({
            settingsCache: settingsCacheStub,
            config: configStub,
            labs: labsStub,
            logging: loggingStub,
            ghostVersion: ghostVersionStub,
            request: requestStub
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructPayload', function () {
        it('constructs correct payload', function () {
            const payload = explorePingService.constructPayload();

            assert.deepEqual(payload, {
                ghost: '4.0.0',
                url: 'https://example.com',
                title: 'Test Blog',
                description: 'Test Description',
                icon: 'icon.png',
                accent_color: '#000000',
                locale: 'en',
                twitter: '@test',
                facebook: 'testfb'
            });
        });
    });

    describe('makeRequest', function () {
        it('makes request with correct parameters', async function () {
            const payload = {test: 'data'};
            requestStub.resolves({statusCode: 200, statusMessage: 'OK'});

            await explorePingService.makeRequest('https://test.com', payload);

            assert.equal(requestStub.calledOnce, true);
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

            assert.equal(loggingStub.warn.calledOnce, true);
            assert.equal(loggingStub.warn.firstCall.args[0], 'Explore Error');
            assert.equal(loggingStub.warn.firstCall.args[1], 'Network error');
        });
    });

    describe('ping', function () {
        it('does not ping if labs flag is not set', async function () {
            labsStub.isSet.returns(false);

            await explorePingService.ping();

            assert.equal(requestStub.called, false);
        });

        it('does not ping if explore URL is not set', async function () {
            configStub.get.withArgs('explore:url').returns(null);

            await explorePingService.ping();

            assert.equal(requestStub.called, false);
            assert.equal(loggingStub.warn.calledOnce, true);
            assert.equal(loggingStub.warn.firstCall.args[0], 'Explore URL not set');
        });

        it('pings with constructed payload when properly configured', async function () {
            requestStub.resolves({statusCode: 200, statusMessage: 'OK'});

            await explorePingService.ping();

            assert.equal(requestStub.calledOnce, true);
            const payload = explorePingService.constructPayload();
            assert.equal(requestStub.firstCall.args[1].body, JSON.stringify(payload));
        });
    });
});
