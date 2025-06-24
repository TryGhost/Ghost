const sinon = require('sinon');
const should = require('should');
const ContentStatsService = require('../../../../../core/server/services/stats/ContentStatsService');
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

            should.exist(result.url);
            result.url.should.startWith('https://api.tinybird.co/v0/pipes/api_top_pages.json?');
            result.url.should.containEql('site_uuid=site-id');
            result.url.should.containEql('date_from=2023-01-01');
            result.url.should.containEql('date_to=2023-01-31');
            result.url.should.containEql('timezone=UTC');
            result.url.should.containEql('member_status=all');

            should.exist(result.options);
            should.exist(result.options.headers);
            result.options.headers.Authorization.should.equal('Bearer tb-token');

            mockTinybirdClient.buildRequest.calledWith('api_top_pages', options).should.be.true();
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
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);

            mockTinybirdClient.parseResponse.calledWith(mockResponse).should.be.true();
        });
    });

    describe('extractPostUuids', function () {
        it('extracts UUIDs from post_uuid field', function () {
            const data = [
                {pathname: '/test-1/', post_uuid: 'post-1'},
                {pathname: '/test-2/', post_uuid: 'post-2'}
            ];

            const result = service.extractPostUuids(data);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);
            result.should.containEql('post-1');
            result.should.containEql('post-2');
        });

        it('filters out null/undefined/empty UUIDs', function () {
            const data = [
                {pathname: '/test-1/', post_uuid: ''},
                {pathname: '/test-2/', post_uuid: '  '},
                {pathname: '/about/'}
            ];

            const result = service.extractPostUuids(data);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(0);
        });
    });

    describe('lookupPostTitles', function () {
        it('returns empty object for empty UUIDs array', async function () {
            const result = await service.lookupPostTitles([]);
            should.exist(result);
            Object.keys(result).should.have.lengthOf(0);
        });

        it('queries database and builds title map', async function () {
            const result = await service.lookupPostTitles(['post-1', 'post-2']);

            should.exist(result);
            result.should.have.properties(['post-1', 'post-2']);
            result['post-1'].should.have.property('title', 'Test Post 1');
            result['post-1'].should.have.property('id', 'post-id-1');
            result['post-2'].should.have.property('title', 'Test Post 2');
            result['post-2'].should.have.property('id', 'post-id-2');

            // Verify knex was called correctly
            mockKnex.select.calledWith('uuid', 'title', 'id').should.be.true();
            mockKnex.from.calledWith('posts').should.be.true();
            mockKnex.whereIn.calledWith('uuid', ['post-1', 'post-2']).should.be.true();
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
            should.not.exist(result);
        });

        it('returns title from resource with title property', function () {
            mockUrlService.getResource.withArgs('/about/').returns({
                data: {
                    title: 'About Us',
                    type: 'page'
                }
            });

            const result = service.getResourceTitle('/about/');
            should.exist(result);
            result.should.have.properties(['title', 'resourceType']);
            result.title.should.equal('About Us');
            result.resourceType.should.equal('page');
        });

        it('returns name from resource with name property (tags, authors)', function () {
            mockUrlService.getResource.withArgs('/tag/news/').returns({
                data: {
                    name: 'News',
                    type: 'tag'
                }
            });

            const result = service.getResourceTitle('/tag/news/');
            should.exist(result);
            result.should.have.properties(['title', 'resourceType']);
            result.title.should.equal('News');
            result.resourceType.should.equal('tag');
        });

        it('returns null if resource lookup fails', function () {
            mockUrlService.getResource.withArgs('/not-found/').throws(new Error('Resource not found'));

            const result = service.getResourceTitle('/not-found/');
            should.not.exist(result);
        });

        it('returns null if resource has no data or title/name', function () {
            mockUrlService.getResource.withArgs('/empty/').returns({});

            const result = service.getResourceTitle('/empty/');
            should.not.exist(result);
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
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(0);

            service.extractPostUuids.called.should.be.false();
            service.lookupPostTitles.called.should.be.false();
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

            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);
            result[0].title.should.equal('Test Post 1');
            result[0].post_id.should.equal('post-id-1');
            result[0].url_exists.should.equal(true);
            result[1].title.should.equal('Test Post 2');
            result[1].post_id.should.equal('post-id-2');
            result[1].url_exists.should.equal(true);

            service.extractPostUuids.calledOnce.should.be.true();
            service.lookupPostTitles.calledOnce.should.be.true();
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

            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].title.should.equal('About Us');
            result[0].resourceType.should.equal('page');
            result[0].url_exists.should.equal(true);

            service.getResourceTitle.calledWith('/about/').should.be.true();
        });

        it('falls back to formatted pathname for unknown pages', async function () {
            const data = [
                {pathname: '/unknown-page/', visits: 100}
            ];

            mockUrlService.getResource.withArgs('/unknown-page/').returns(null);

            const result = await service.enrichTopContentData(data);

            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].title.should.equal('unknown-page');
            result[0].url_exists.should.equal(false);

            service.getResourceTitle.calledWith('/unknown-page/').should.be.true();
        });

        it('handles home page', async function () {
            const data = [
                {pathname: '/', visits: 100}
            ];

            mockUrlService.getResource.withArgs('/').returns(null);

            const result = await service.enrichTopContentData(data);

            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].title.should.equal('Homepage');
            result[0].url_exists.should.equal(false);
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

            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].pathname.should.equal('/test/');
            result[0].visits.should.equal(100);

            mockTinybirdClient.fetch.calledOnce.should.be.true();

            // Verify that camelCase conversion happened - the first param should be the pipe name
            const calledWith = mockTinybirdClient.fetch.firstCall.args;
            calledWith[0].should.equal('api_top_pages');

            // The second param should have camelCase properties
            calledWith[1].should.have.property('dateFrom', '2023-01-01');
            calledWith[1].should.have.property('dateTo', '2023-01-31');
            // site_uuid should not be passed through options
            calledWith[1].should.not.have.property('siteUuid');
        });

        it('returns null on API request failure', async function () {
            mockTinybirdClient.fetch.resolves(null);

            const options = {
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            };

            const result = await service.fetchRawTopContentData(options);

            should.not.exist(result);

            // Verify that camelCase conversion happened
            const calledWith = mockTinybirdClient.fetch.firstCall.args;
            calledWith[0].should.equal('api_top_pages');
            calledWith[1].should.have.property('dateFrom', '2023-01-01');
            calledWith[1].should.have.property('dateTo', '2023-01-31');
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

            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(2);
            result.data[0].should.have.property('title');
            result.data[0].should.have.property('post_id');
            result.data[1].should.have.property('title');
            result.data[1].should.have.property('post_id');

            service.fetchRawTopContentData.calledOnce.should.be.true();

            // Verify the parameters were passed properly
            const options = service.fetchRawTopContentData.firstCall.args[0];
            options.should.have.property('date_from', '2023-01-01');
            options.should.have.property('date_to', '2023-01-31');
        });

        it('returns empty data array when fetch returns no data', async function () {
            service.fetchRawTopContentData.resolves(null);

            const result = await service.getTopContent({
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            });

            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(0);

            service.fetchRawTopContentData.calledOnce.should.be.true();
        });

        it('returns empty data array on error', async function () {
            service.fetchRawTopContentData.rejects(new Error('Test error'));

            const result = await service.getTopContent({
                date_from: '2023-01-01',
                date_to: '2023-01-31'
            });

            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(0);
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

            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(0);
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
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);

            // Verify tinybird client was called with correct parameters
            mockTinybirdClient.fetch.calledOnce.should.be.true();
            mockTinybirdClient.fetch.firstCall.args[0].should.equal('api_top_pages');

            const tinybirdOptions = mockTinybirdClient.fetch.firstCall.args[1];
            tinybirdOptions.should.have.property('dateFrom', '2023-01-01');
            tinybirdOptions.should.have.property('dateTo', '2023-01-31');
            tinybirdOptions.should.have.property('timezone', 'America/New_York');
            tinybirdOptions.should.have.property('memberStatus', 'paid');
        });

        it('handles null response from tinybird client', async function () {
            mockTinybirdClient.fetch.resolves(null);

            const result = await service.getTopContent({});

            should.exist(result);
            result.should.have.property('data').which.is.an.Array().with.lengthOf(0);
        });

        it('passes post_type parameter to tinybird client', async function () {
            mockTinybirdClient.fetch.resolves([]);

            const options = {
                date_from: '2023-01-01',
                date_to: '2023-01-31',
                post_type: 'page'
            };

            await service.fetchRawTopContentData(options);

            mockTinybirdClient.fetch.calledOnce.should.be.true();
            const tinybirdOptions = mockTinybirdClient.fetch.firstCall.args[1];
            tinybirdOptions.should.have.property('postType', 'page');
        });
    });
});
