const sinon = require('sinon');
const should = require('should');
const tinybird = require('../../../../../../core/server/services/stats/utils/tinybird');

describe('Tinybird Client', function () {
    let tinybirdClient;
    let mockConfig;
    let mockRequest;
    
    beforeEach(function () {
        // Set up mocks
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

        // Create tinybird client with mocked dependencies
        tinybirdClient = tinybird.create({
            config: mockConfig,
            request: mockRequest
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('buildRequest', function () {
        it('builds correct request with default options', function () {
            const {url, options} = tinybirdClient.buildRequest('test_pipe', {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            });

            should.exist(url);
            url.should.startWith('https://api.tinybird.co/v0/pipes/test_pipe.json?');
            url.should.containEql('site_uuid=site-id');
            url.should.containEql('date_from=2023-01-01');
            url.should.containEql('date_to=2023-01-31');
            url.should.containEql('timezone=UTC');
            url.should.containEql('member_status=all');

            should.exist(options);
            should.exist(options.headers);
            options.headers.Authorization.should.equal('Bearer tb-token');
        });

        it('uses tbVersion if provided', function () {
            const {url} = tinybirdClient.buildRequest('test_pipe', {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31',
                tbVersion: '2'
            });

            url.should.startWith('https://api.tinybird.co/v0/pipes/test_pipe__v2.json?');
        });

        it('overrides defaults with provided options', function () {
            const {url} = tinybirdClient.buildRequest('test_pipe', {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31',
                timezone: 'America/New_York',
                memberStatus: 'paid'
            });

            url.should.containEql('site_uuid=site-id');
            url.should.containEql('timezone=America%2FNew_York');
            url.should.containEql('member_status=paid');
        });
        
        it('uses local endpoint and token when local is enabled', function () {
            // Update config mock to return local config
            mockConfig.get.withArgs('tinybird:stats').returns({
                id: 'site-id',
                endpoint: 'https://api.tinybird.co',
                token: 'tb-token',
                local: {
                    enabled: true,
                    endpoint: 'http://localhost:8000',
                    token: 'local-token'
                }
            });
            
            const {url, options} = tinybirdClient.buildRequest('test_pipe', {});
            
            url.should.startWith('http://localhost:8000/v0/pipes/test_pipe.json?');
            options.headers.Authorization.should.equal('Bearer local-token');
        });
        
        it('ignores tbVersion when local is enabled', function () {
            // Update config mock to return local config
            mockConfig.get.withArgs('tinybird:stats').returns({
                id: 'site-id',
                endpoint: 'https://api.tinybird.co',
                token: 'tb-token',
                local: {
                    enabled: true,
                    endpoint: 'http://localhost:8000',
                    token: 'local-token'
                }
            });
            
            const {url} = tinybirdClient.buildRequest('test_pipe', {
                tbVersion: '2'
            });
            
            // Should not contain __v2 in the URL
            url.should.startWith('http://localhost:8000/v0/pipes/test_pipe.json?');
        });
    });

    describe('parseResponse', function () {
        it('handles JSON string in response.body', function () {
            const mockResponse = {
                body: JSON.stringify({
                    data: [
                        {pathname: '/test-1/', visits: 100},
                        {pathname: '/test-2/', visits: 50}
                    ]
                })
            };

            const result = tinybirdClient.parseResponse(mockResponse);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);
            result[0].pathname.should.equal('/test-1/');
            result[0].visits.should.equal(100);
        });

        it('handles JSON object in response.body', function () {
            const mockResponse = {
                body: {
                    data: [
                        {pathname: '/test-1/', visits: 100},
                        {pathname: '/test-2/', visits: 50}
                    ]
                }
            };

            const result = tinybirdClient.parseResponse(mockResponse);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);
        });

        it('handles direct JSON string response', function () {
            const mockResponse = JSON.stringify({
                data: [
                    {pathname: '/test-1/', visits: 100}
                ]
            });

            const result = tinybirdClient.parseResponse(mockResponse);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
        });

        it('handles direct object response', function () {
            const mockResponse = {
                data: [
                    {pathname: '/test-1/', visits: 100}
                ]
            };

            const result = tinybirdClient.parseResponse(mockResponse);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(1);
        });

        it('returns empty array for empty data', function () {
            const mockResponse = {
                body: {data: []}
            };

            const result = tinybirdClient.parseResponse(mockResponse);
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(0);
        });

        it('returns null for invalid JSON', function () {
            const mockResponse = {
                body: 'not json'
            };

            const result = tinybirdClient.parseResponse(mockResponse);
            should.equal(result, null);
        });
    });

    describe('fetch', function () {
        it('successfully fetches and parses data', async function () {
            // Setup mock response
            mockRequest.get.resolves({
                body: {
                    data: [
                        {pathname: '/test-1/', visits: 100},
                        {pathname: '/test-2/', visits: 50}
                    ]
                }
            });
            
            const result = await tinybirdClient.fetch('test_pipe', {
                dateFrom: '2023-01-01',
                dateTo: '2023-01-31'
            });
            
            should.exist(result);
            result.should.be.an.Array().with.lengthOf(2);
            result[0].pathname.should.equal('/test-1/');
            result[0].visits.should.equal(100);
            
            // Verify request was called with correct parameters
            mockRequest.get.calledOnce.should.be.true();
            const [url, options] = mockRequest.get.firstCall.args;
            url.should.startWith('https://api.tinybird.co/v0/pipes/test_pipe.json?');
            options.headers.Authorization.should.equal('Bearer tb-token');
        });
        
        it('returns null when request fails', async function () {
            // Setup mock to throw error
            mockRequest.get.rejects(new Error('Network error'));
            
            const result = await tinybirdClient.fetch('test_pipe', {});
            
            should.equal(result, null);
            mockRequest.get.calledOnce.should.be.true();
        });
        
        it('returns null when response parsing fails', async function () {
            // Setup mock with invalid response
            mockRequest.get.resolves({
                body: 'invalid json'
            });
            
            const result = await tinybirdClient.fetch('test_pipe', {});
            
            should.equal(result, null);
            mockRequest.get.calledOnce.should.be.true();
        });
    });
}); 