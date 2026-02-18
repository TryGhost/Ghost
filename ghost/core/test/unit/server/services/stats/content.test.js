const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const ContentStatsService = require('../../../../../core/server/services/stats/content-stats-service');
const tinybird = require('../../../../../core/server/services/stats/utils/tinybird');

describe('ContentStatsService', function () {
    let service;
    let mockKnex;
    let mockUrlService;
    let mockTinybirdClient;

    beforeEach(function () {
        // Set up mocks
        mockKnex = {
            select: sinon.stub().returnsThis(),
            from: sinon.stub().returnsThis(),
            whereIn: sinon.stub().resolves([
                {uuid: 'post-1', title: 'Test Post 1', id: 'post-id-1'},
                {uuid: 'post-2', title: 'Test Post 2', id: 'post-id-2'}
            ])
        };

        mockUrlService = {
            getResource: sinon.stub(),
            hasFinished: sinon.stub().returns(true)
        };

        // Create mock Tinybird client
        mockTinybirdClient = {
            buildRequest: sinon.stub(),
            parseResponse: sinon.stub(),
            fetch: sinon.stub()
        };

        // Stub tinybird.create to return our mock client
        sinon.stub(tinybird, 'create').returns(mockTinybirdClient);

        // Create service instance with mocked dependencies
        service = new ContentStatsService({
            knex: mockKnex,
            urlService: mockUrlService,
            tinybirdClient: mockTinybirdClient
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('tinybird client integration', function () {
        it('buildRequest builds correct request with default options', function () {
            mockTinybirdClient.buildRequest.returns({
                url: 'https://api.tinybird.co/v0/pipes/api_top_pages.json?site_uuid=site-id&date_from=2023-01-01&date_to=2023-01-31&timezone=UTC&member_status=all',
                options: {
                    headers: {
                        Authorization: 'Bearer tb-token'
                    },
                    timeout: {
                        request: 10000
                    }
                }
            });

            const options = {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            };

            const result = mockTinybirdClient.buildRequest('api_top_pages', options);

            assertExists(result.url);
            assert(result.url.startsWith('https://api.tinybird.co/v0/pipes/api_top_pages.json?'));
            assert(result.url.includes('site_uuid=site-id'));
            assert(result.url.includes('date_from=2023-01-01'));
            assert(result.url.includes('date_to=2023-01-31'));
            assert(result.url.includes('timezone=UTC'));
            assert(result.url.includes('member_status=all'));

            assertExists(result.options);
            assertExists(result.options.headers);
            assert.equal(result.options.headers.Authorization, 'Bearer tb-token');

            assert.equal(mockTinybirdClient.buildRequest.calledWith('api_top_pages', options), true);
        });

        it('parseResponse handles various response formats', function () {
            const mockResponse = {
                body: {
                    data: [
                        {pathname: '/test-1/', visits: 100},
                        {pathname: '/test-2/', visits: 50}
                    ]
                }
            };

            mockTinybirdClient.parseResponse.returns([
                {pathname: '/test-1/', visits: 100},
                {pathname: '/test-2/', visits: 50}
            ]);

            const result = mockTinybirdClient.parseResponse(mockResponse);
            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 2);

            assert.equal(mockTinybirdClient.parseResponse.calledWith(mockResponse), true);
        });
    });

    describe('extractPostUuids', function () {
        it('extracts UUIDs from post_uuid field', function () {
            const data = [
                {pathname: '/test-1/', post_uuid: 'post-1'},
                {pathname: '/test-2/', post_uuid: 'post-2'}
            ];

            const result = service.extractPostUuids(data);
            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 2);
            assert(result.includes('post-1'));
            assert(result.includes('post-2'));
        });

        it('filters out null/undefined/empty UUIDs', function () {
            const data = [
                {pathname: '/test-1/', post_uuid: ''},
                {pathname: '/test-2/', post_uuid: '  '},
                {pathname: '/about/'}
            ];

            const result = service.extractPostUuids(data);
            assertExists(result);
            assert.deepEqual(result, []);
        });
    });

    describe('lookupPostTitles', function () {
        it('returns empty object for empty UUIDs array', async function () {
            const result = await service.lookupPostTitles([]);
            assertExists(result);
            assert.equal(Object.keys(result).length, 0);
        });

        it('queries database and builds title map', async function () {
            const result = await service.lookupPostTitles(['post-1', 'post-2']);

            assertExists(result);
            assert.equal(result['post-1'].title, 'Test Post 1');
            assert.equal(result['post-1'].id, 'post-id-1');
            assert.equal(result['post-2'].title, 'Test Post 2');
            assert.equal(result['post-2'].id, 'post-id-2');

            // Verify knex was called correctly
            assert.equal(mockKnex.select.calledWith('uuid', 'title', 'id'), true);
            assert.equal(mockKnex.from.calledWith('posts'), true);
            assert.equal(mockKnex.whereIn.calledWith('uuid', ['post-1', 'post-2']), true);
        });
    });

    describe('getResourceTitle', function () {
        it('returns null if urlService is not available', function () {
            // Create service without urlService
            const serviceNoUrl = new ContentStatsService({
                knex: mockKnex,
                urlService: null
            });

            const result = serviceNoUrl.getResourceTitle('/about/');
            assert.equal(result, null);
        });

        it('returns title from resource with title property', function () {
            mockUrlService.getResource.withArgs('/about/').returns({
                data: {
                    title: 'About Us',
                    type: 'page'
                }
            });

            const result = service.getResourceTitle('/about/');
            assertExists(result);
            assert.equal(result.title, 'About Us');
            assert.equal(result.resourceType, 'page');
        });

        it('returns name from resource with name property (tags, authors)', function () {
            mockUrlService.getResource.withArgs('/tag/news/').returns({
                data: {
                    name: 'News',
                    type: 'tag'
                }
            });

            const result = service.getResourceTitle('/tag/news/');
            assertExists(result);
            assert.equal(result.title, 'News');
            assert.equal(result.resourceType, 'tag');
        });

        it('returns null if resource lookup fails', function () {
            mockUrlService.getResource.withArgs('/not-found/').throws(new Error('Resource not found'));

            const result = service.getResourceTitle('/not-found/');
            assert.equal(result, null);
        });

        it('returns null if resource has no data or title/name', function () {
            mockUrlService.getResource.withArgs('/empty/').returns({});

            const result = service.getResourceTitle('/empty/');
            assert.equal(result, null);
        });
    });

    describe('enrichTopContentData', function () {
        beforeEach(function () {
            // Spy on internal methods
            sinon.spy(service, 'extractPostUuids');
            sinon.spy(service, 'lookupPostTitles');
            sinon.spy(service, 'getResourceTitle');
        });

        it('returns empty array for empty input', async function () {
            const result = await service.enrichTopContentData([]);
            assertExists(result);
            assert.deepEqual(result, []);

            assert.equal(service.extractPostUuids.called, false);
            assert.equal(service.lookupPostTitles.called, false);
        });

        it('enriches data with post_uuid titles', async function () {
            const data = [
                {pathname: '/post-1/', post_uuid: 'post-1', visits: 100},
                {pathname: '/post-2/', post_uuid: 'post-2', visits: 50}
            ];

            // Mock urlService to return resources for these paths
            mockUrlService.getResource.withArgs('/post-1/').returns({data: {title: 'Post 1'}});
            mockUrlService.getResource.withArgs('/post-2/').returns({data: {title: 'Post 2'}});

            const result = await service.enrichTopContentData(data);

            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 2);
            assert.equal(result[0].title, 'Test Post 1');
            assert.equal(result[0].post_id, 'post-id-1');
            assert.equal(result[0].url_exists, true);
            assert.equal(result[1].title, 'Test Post 2');
            assert.equal(result[1].post_id, 'post-id-2');
            assert.equal(result[1].url_exists, true);

            assert.equal(service.extractPostUuids.calledOnce, true);
            assert.equal(service.lookupPostTitles.calledOnce, true);
        });

        it('uses urlService for non-post pages', async function () {
            const data = [
                {pathname: '/about/', visits: 100}
            ];

            mockUrlService.getResource.withArgs('/about/').returns({
                data: {
                    title: 'About Us',
                    type: 'page'
                }
            });

            const result = await service.enrichTopContentData(data);

            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 1);
            assert.equal(result[0].title, 'About Us');
            assert.equal(result[0].resourceType, 'page');
            assert.equal(result[0].url_exists, true);

            assert.equal(service.getResourceTitle.calledWith('/about/'), true);
        });

        it('falls back to formatted pathname for unknown pages', async function () {
            const data = [
                {pathname: '/unknown-page/', visits: 100}
            ];

            mockUrlService.getResource.withArgs('/unknown-page/').returns(null);

            const result = await service.enrichTopContentData(data);

            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 1);
            assert.equal(result[0].title, 'unknown-page');
            assert.equal(result[0].url_exists, false);

            assert.equal(service.getResourceTitle.calledWith('/unknown-page/'), true);
        });

        it('handles home page', async function () {
            const data = [
                {pathname: '/', visits: 100}
            ];

            mockUrlService.getResource.withArgs('/').returns(null);

            const result = await service.enrichTopContentData(data);

            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 1);
            assert.equal(result[0].title, 'Homepage');
            assert.equal(result[0].url_exists, false);
        });
    });

    describe('fetchRawTopContentData', function () {
        it('returns data from successful API request', async function () {
            const expectedData = [
                {pathname: '/test/', visits: 100}
            ];

            mockTinybirdClient.fetch.resolves(expectedData);

            // Use snake_case parameters as expected in the API
            const options = {
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            };

            const result = await service.fetchRawTopContentData(options);

            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 1);
            assert.equal(result[0].pathname, '/test/');
            assert.equal(result[0].visits, 100);

            assert.equal(mockTinybirdClient.fetch.calledOnce, true);

            // Verify that camelCase conversion happened - the first param should be the pipe name
            const calledWith = mockTinybirdClient.fetch.firstCall.args;
            assert.equal(calledWith[0], 'api_top_pages');

            // The second param should have camelCase properties
            assert.equal(calledWith[1].dateFrom, '2023-01-01');
            assert.equal(calledWith[1].dateTo, '2023-01-31');
            // site_uuid should not be passed through options
            assert(!('siteUuid' in calledWith[1]));
        });

        it('returns null on API request failure', async function () {
            mockTinybirdClient.fetch.resolves(null);

            const options = {
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            };

            const result = await service.fetchRawTopContentData(options);

            assert.equal(result, null);

            // Verify that camelCase conversion happened
            const calledWith = mockTinybirdClient.fetch.firstCall.args;
            assert.equal(calledWith[0], 'api_top_pages');
            assert.equal(calledWith[1].dateFrom, '2023-01-01');
            assert.equal(calledWith[1].dateTo, '2023-01-31');
        });
    });

    describe('getTopContent', function () {
        beforeEach(function () {
            // Use real methods but stub fetchRawTopContentData
            sinon.stub(service, 'fetchRawTopContentData');
        });

        it('returns enriched data for successful request', async function () {
            // Mock successful fetch of raw data
            const mockRawData = [
                {pathname: '/test-1/', post_uuid: 'post-1', visits: 100},
                {pathname: '/test-2/', post_uuid: 'post-2', visits: 50}
            ];
            service.fetchRawTopContentData.resolves(mockRawData);

            const result = await service.getTopContent({
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            });

            assertExists(result);
            assertExists(result.data);
            assert(Array.isArray(result.data));
            assert.equal(result.data.length, 2);
            assert('title' in result.data[0]);
            assert('post_id' in result.data[0]);
            assert('title' in result.data[1]);
            assert('post_id' in result.data[1]);

            assert.equal(service.fetchRawTopContentData.calledOnce, true);

            // Verify the parameters were passed properly
            const options = service.fetchRawTopContentData.firstCall.args[0];
            assert.equal(options.date_from, '2023-01-01');
            assert.equal(options.date_to, '2023-01-31');
        });

        it('returns empty data array when fetch returns no data', async function () {
            service.fetchRawTopContentData.resolves(null);

            const result = await service.getTopContent({
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            });

            assertExists(result);
            assertExists(result.data);
            assert.deepEqual(result.data, []);

            assert.equal(service.fetchRawTopContentData.calledOnce, true);
        });

        it('returns empty data array on error', async function () {
            service.fetchRawTopContentData.rejects(new Error('Test error'));

            const result = await service.getTopContent({
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            });

            assertExists(result);
            assertExists(result.data);
            assert.deepEqual(result.data, []);
        });

        it('returns empty data array when tinybirdClient is not available', async function () {
            // Create a service without tinybirdClient
            const serviceNoTinybird = new ContentStatsService({
                knex: mockKnex,
                urlService: mockUrlService
            });

            const result = await serviceNoTinybird.getTopContent({
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            });

            assertExists(result);
            assertExists(result.data);
            assert.deepEqual(result.data, []);
        });
    });

    describe('tinybird integration', function () {
        it('fetchRawTopContentData calls tinybird client with correct parameters', async function () {
            // Mock the fetch method instead of internal implementation details
            mockTinybirdClient.fetch.resolves([
                {pathname: '/test-1/', visits: 100},
                {pathname: '/test-2/', visits: 50}
            ]);

            const options = {
                date_from: '2023-01-01',
                date_to: '2023-01-31',
                timezone: 'America/New_York',
                member_status: 'paid'
            };

            const result = await service.fetchRawTopContentData(options);

            // Verify result is correct
            assertExists(result);
            assert(Array.isArray(result));
            assert.equal(result.length, 2);

            // Verify tinybird client was called with correct parameters
            assert.equal(mockTinybirdClient.fetch.calledOnce, true);
            assert.equal(mockTinybirdClient.fetch.firstCall.args[0], 'api_top_pages');

            const tinybirdOptions = mockTinybirdClient.fetch.firstCall.args[1];
            assert.equal(tinybirdOptions.dateFrom, '2023-01-01');
            assert.equal(tinybirdOptions.dateTo, '2023-01-31');
            assert.equal(tinybirdOptions.timezone, 'America/New_York');
            assert.equal(tinybirdOptions.memberStatus, 'paid');
        });

        it('handles null response from tinybird client', async function () {
            mockTinybirdClient.fetch.resolves(null);

            const result = await service.getTopContent({});

            assertExists(result);
            assert.deepEqual(result.data, []);
        });

        it('passes all filter parameters to tinybird client with correct shape', async function () {
            mockTinybirdClient.fetch.resolves([]);

            const options = {
                date_from: '2023-01-01',
                date_to: '2023-01-31',
                timezone: 'America/New_York',
                member_status: 'paid',
                post_type: 'page',
                post_uuid: 'post-123',
                source: 'google.com',
                utm_source: 'newsletter',
                utm_medium: 'email',
                utm_campaign: 'spring_sale',
                utm_content: 'banner',
                utm_term: 'headless_cms'
            };

            await service.fetchRawTopContentData(options);

            assert.equal(mockTinybirdClient.fetch.calledOnce, true);
            assert.equal(mockTinybirdClient.fetch.firstCall.args[0], 'api_top_pages');

            const tinybirdOptions = mockTinybirdClient.fetch.firstCall.args[1];
            // Base parameters
            assert.equal(tinybirdOptions.dateFrom, '2023-01-01');
            assert.equal(tinybirdOptions.dateTo, '2023-01-31');
            assert.equal(tinybirdOptions.timezone, 'America/New_York');
            assert.equal(tinybirdOptions.memberStatus, 'paid');
            // Content filters
            assert.equal(tinybirdOptions.postType, 'page');
            assert.equal(tinybirdOptions.postUuid, 'post-123');
            // Source filter
            assert.equal(tinybirdOptions.source, 'google.com');
            // UTM filters
            assert.equal(tinybirdOptions.utmSource, 'newsletter');
            assert.equal(tinybirdOptions.utmMedium, 'email');
            assert.equal(tinybirdOptions.utmCampaign, 'spring_sale');
            assert.equal(tinybirdOptions.utmContent, 'banner');
            assert.equal(tinybirdOptions.utmTerm, 'headless_cms');
        });
    });
});
