const sinon = require('sinon');
const should = require('should');
const TopPagesStatsService = require('../../../../../core/server/services/stats/TopPagesStatsService');
const tinybird = require('../../../../../core/server/services/stats/utils/tinybird');

describe('TopPagesStatsService', function () {
    let service;
    let mockKnex;
    let mockUrlService;
    let mockConfig;
    let mockRequest;
    let mockTinybirdClient;

    beforeEach(function () {
        // Set up mocks
        mockKnex = {
            select: sinon.stub().returnsThis(),
            from: sinon.stub().returnsThis(),
            whereIn: sinon.stub().resolves([
                {uuid: 'post-1', title: 'Test Post 1'},
                {uuid: 'post-2', title: 'Test Post 2'}
            ])
        };

        mockUrlService = {
            getResource: sinon.stub()
        };

        mockConfig = {
            get: sinon.stub()
        };
        
        mockRequest = {
            get: sinon.stub()
        };

        // Configure mocks
        mockConfig.get.withArgs('timezone').returns('UTC');
        mockConfig.get.withArgs('tinybird:stats').returns({
            id: 'site-id',
            endpoint: 'https://api.tinybird.co',
            token: 'tb-token'
        });

        // Create mock Tinybird client
        mockTinybirdClient = {
            buildRequest: sinon.stub(),
            parseResponse: sinon.stub(),
            fetch: sinon.stub()
        };

        // Stub tinybird.create to return our mock client
        sinon.stub(tinybird, 'create').returns(mockTinybirdClient);

        // Create service instance with mocked dependencies
        service = new TopPagesStatsService({
            knex: mockKnex,
            urlService: mockUrlService,
            config: mockConfig,
            request: mockRequest,
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

        it('returns null for empty data', function () {
            const mockResponse = {
                body: {data: []}
            };

            mockTinybirdClient.parseResponse.returns(null);

            const result = mockTinybirdClient.parseResponse(mockResponse);
            should.equal(result, null);
            
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
            result['post-1'].should.equal('Test Post 1');
            result['post-2'].should.equal('Test Post 2');
            
            // Verify knex was called correctly
            mockKnex.select.calledWith('uuid', 'title').should.be.true();
            mockKnex.from.calledWith('posts').should.be.true();
            mockKnex.whereIn.calledWith('uuid', ['post-1', 'post-2']).should.be.true();
        });
    });

    describe('getResourceTitle', function () {
        it('returns null if urlService is not available', function () {
            // Create service without urlService
            const serviceNoUrl = new TopPagesStatsService({
                knex: mockKnex,
                urlService: null,
                config: mockConfig
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

    describe('enrichTopPagesData', function () {
        beforeEach(function () {
            // Spy on internal methods
            sinon.spy(service, 'extractPostUuids');
            sinon.spy(service, 'lookupPostTitles');
            sinon.spy(service, 'getResourceTitle');
        });

        it('returns empty array for empty input', async function () {
            const result = await service.enrichTopPagesData([]);
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
            
            const result = await service.enrichTopPagesData(data);
            
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);
            result[0].title.should.equal('Test Post 1');
            result[1].title.should.equal('Test Post 2');
            
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
            
            const result = await service.enrichTopPagesData(data);
            
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].title.should.equal('About Us');
            result[0].resourceType.should.equal('page');
            
            service.getResourceTitle.calledWith('/about/').should.be.true();
        });

        it('falls back to formatted pathname for unknown pages', async function () {
            const data = [
                {pathname: '/unknown-page/', visits: 100}
            ];
            
            mockUrlService.getResource.withArgs('/unknown-page/').returns(null);
            
            const result = await service.enrichTopPagesData(data);
            
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].title.should.equal('unknown-page');
        });

        it('handles home page', async function () {
            const data = [
                {pathname: '/', visits: 100}
            ];
            
            mockUrlService.getResource.withArgs('/').returns(null);
            
            const result = await service.enrichTopPagesData(data);
            
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].title.should.equal('Home');
        });
    });

    describe('fetchRawTopPagesData', function () {
        it('returns data from successful API request', async function () {
            const expectedData = [
                {pathname: '/test/', visits: 100}
            ];
            
            mockTinybirdClient.fetch.resolves(expectedData);
            
            const options = {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            };
            
            const result = await service.fetchRawTopPagesData(options);
            
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
            result[0].pathname.should.equal('/test/');
            result[0].visits.should.equal(100);
            
            mockTinybirdClient.fetch.calledOnce.should.be.true();
            mockTinybirdClient.fetch.calledWith('api_top_pages', options).should.be.true();
        });

        it('returns null on API request failure', async function () {
            mockTinybirdClient.fetch.resolves(null);
            
            const options = {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            };
            
            const result = await service.fetchRawTopPagesData(options);
            
            should.not.exist(result);
            mockTinybirdClient.fetch.calledWith('api_top_pages', options).should.be.true();
        });
    });

    describe('getTopPages', function () {
        beforeEach(function () {
            // Use real methods but stub fetchRawTopPagesData
            sinon.stub(service, 'fetchRawTopPagesData');
        });

        it('returns enriched data for successful request', async function () {
            // Mock successful fetch of raw data
            const mockRawData = [
                {pathname: '/test-1/', post_uuid: 'post-1', visits: 100},
                {pathname: '/test-2/', post_uuid: 'post-2', visits: 50}
            ];
            service.fetchRawTopPagesData.resolves(mockRawData);
            
            const result = await service.getTopPages({
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            });
            
            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(2);
            result.data[0].should.have.property('title');
            
            service.fetchRawTopPagesData.calledOnce.should.be.true();
        });

        it('returns empty data array when fetch returns no data', async function () {
            service.fetchRawTopPagesData.resolves(null);
            
            const result = await service.getTopPages({
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            });
            
            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(0);
            
            service.fetchRawTopPagesData.calledOnce.should.be.true();
        });

        it('returns empty data array on error', async function () {
            service.fetchRawTopPagesData.rejects(new Error('Test error'));
            
            const result = await service.getTopPages({
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            });
            
            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(0);
        });

        it('returns empty data array when tinybirdClient is not available', async function () {
            // Create a service without tinybirdClient
            const serviceNoTinybird = new TopPagesStatsService({
                knex: mockKnex,
                urlService: mockUrlService
            });
            
            const result = await serviceNoTinybird.getTopPages({
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            });
            
            should.exist(result);
            should.exist(result.data);
            result.data.should.be.an.Array().with.lengthOf(0);
        });
    });
}); 