const {expect} = require('chai');
const sinon = require('sinon');
const path = require('path');

describe('ghost-stats.js', function () {
    let sandbox;
    let mockWindow;
    let mockDocument;
    let mockFetch;
    let mockStorage;
    let browserService;
    let ghostStats;

    // Test helper functions
    const createMockConfig = (overrides = {}) => ({
        host: 'https://test.com',
        token: 'test-token',
        siteUuid: 'test-site-uuid',
        ...overrides
    });

    const setupMockConfig = (config = createMockConfig()) => {
        mockDocument.currentScript.getAttribute.withArgs('data-host').returns(config.host);
        mockDocument.currentScript.getAttribute.withArgs('data-token').returns(config.token);
        mockDocument.currentScript.attributes = [
            {name: 'tb_site_uuid', value: config.siteUuid}
        ];
        ghostStats.initConfig();
    };

    const getLastRequest = () => {
        expect(mockFetch.called).to.be.true;
        const [url, options] = mockFetch.lastCall.args;
        return {url, options, payload: JSON.parse(options.body)};
    };

    const getLastPayload = () => {
        const {payload} = getLastRequest();
        return JSON.parse(payload.payload);
    };

    const expectRequestToContain = (expectedFields) => {
        const {payload} = getLastRequest();
        const innerPayload = JSON.parse(payload.payload);
        
        Object.entries(expectedFields).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                expect(innerPayload[key]).to.deep.include(value);
            } else {
                expect(innerPayload[key]).to.equal(value);
            }
        });
    };

    const expectRequestStructure = (expectedStructure) => {
        const {url, options, payload} = getLastRequest();
        
        if (expectedStructure.url) {
            expect(url).to.include(expectedStructure.url);
        }
        if (expectedStructure.method) {
            expect(options.method).to.equal(expectedStructure.method);
        }
        if (expectedStructure.headers) {
            Object.entries(expectedStructure.headers).forEach(([key, value]) => {
                expect(options.headers[key]).to.equal(value);
            });
        }
        if (expectedStructure.payloadFields) {
            expectedStructure.payloadFields.forEach((field) => {
                expect(payload).to.have.property(field);
            });
        }
    };

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        
        // Setup mock fetch
        mockFetch = sandbox.stub().resolves({ok: true});

        // Setup mock storage
        mockStorage = {
            getItem: sandbox.stub(),
            setItem: sandbox.stub(),
            removeItem: sandbox.stub(),
            length: 0,
            clear: sandbox.stub(),
            key: sandbox.stub()
        };

        // Setup mock document with minimal required properties
        mockDocument = {
            currentScript: {
                getAttribute: sandbox.stub(),
                attributes: []
            },
            visibilityState: 'visible',
            addEventListener: sandbox.stub(),
            removeEventListener: sandbox.stub(),
            referrer: 'https://example.com'
        };

        // Setup mock window with minimal required properties
        mockWindow = {
            location: {
                hostname: 'example.com',
                pathname: '/test',
                href: 'https://example.com/test'
            },
            navigator: {
                userAgent: 'test-agent',
                languages: ['en-US'],
                language: 'en-US',
                webdriver: false
            },
            history: {
                pushState: sandbox.stub()
            },
            addEventListener: sandbox.stub(),
            removeEventListener: sandbox.stub(),
            setTimeout: sandbox.stub().returns(123),
            clearTimeout: sandbox.stub(),
            Intl: {
                DateTimeFormat: () => ({
                    resolvedOptions: () => ({
                        timeZone: 'America/New_York'
                    })
                })
            },
            fetch: mockFetch,
            localStorage: mockStorage,
            sessionStorage: mockStorage,
            document: mockDocument
        };

        // Make sure document.referrer is accessible via window.document.referrer
        mockWindow.document = mockDocument;

        // Setup global mocks for url-attribution.js
        global.window = mockWindow;
        global.document = mockDocument;
        global.localStorage = mockStorage;
        global.sessionStorage = mockStorage;

        // Create browser service instance with mocks
        const {BrowserService} = require(path.resolve(__dirname, '../../../../core/frontend/src/ghost-stats/browser-service.js'));
        browserService = new BrowserService(mockWindow, mockDocument);

        // Create GhostStats instance with mocked browser service
        const {GhostStats} = require(path.resolve(__dirname, '../../../../core/frontend/src/ghost-stats/ghost-stats.js'));
        ghostStats = new GhostStats(browserService);
    });

    afterEach(function () {
        sandbox.restore();
        delete global.window;
        delete global.document;
        delete global.localStorage;
        delete global.sessionStorage;
    });

    describe('BrowserService', function () {
        it('should allow synthetic monitoring to bypass test environment detection', function () {
            // Set up webdriver environment (normally would be detected as test)
            Object.defineProperty(mockWindow.navigator, 'webdriver', {
                value: true,
                configurable: true
            });
            expect(browserService.isTestEnvironment()).to.be.true;

            // Enable synthetic monitoring flag - should bypass test detection
            Object.defineProperty(mockWindow, '__GHOST_SYNTHETIC_MONITORING__', {
                value: true,
                configurable: true
            });
            expect(browserService.isTestEnvironment()).to.be.false;

            // Clean up
            delete mockWindow.__GHOST_SYNTHETIC_MONITORING__;
            delete mockWindow.navigator.webdriver;
        });

        it('should handle browser APIs safely', function () {
            expect(browserService.getNavigator()).to.equal(mockWindow.navigator);
            expect(browserService.getLocation()).to.equal(mockWindow.location);
            expect(browserService.getTimezone()).to.equal('America/New_York');
            expect(browserService.getCurrentScript()).to.equal(mockDocument.currentScript);
            expect(browserService.getVisibilityState()).to.equal('visible');
        });

        it('should manage event listeners correctly', function () {
            const callback = () => {};
            browserService.addEventListener('window', 'test', callback);
            expect(mockWindow.addEventListener.called && 
                   mockWindow.addEventListener.firstCall.args[0] === 'test' && 
                   mockWindow.addEventListener.firstCall.args[1] === callback).to.be.true;

            browserService.addEventListener('document', 'test', callback);
            expect(mockDocument.addEventListener.called && 
                   mockDocument.addEventListener.firstCall.args[0] === 'test' && 
                   mockDocument.addEventListener.firstCall.args[1] === callback).to.be.true;

            browserService.removeEventListener('window', 'test', callback);
            expect(mockWindow.removeEventListener.called && 
                   mockWindow.removeEventListener.firstCall.args[0] === 'test' && 
                   mockWindow.removeEventListener.firstCall.args[1] === callback).to.be.true;
        });
    });

    describe('GhostStats Configuration', function () {
        it('should initialize with host and token', function () {
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            
            expect(ghostStats.initConfig()).to.be.true;
        });

        it('should initialize with host and no token', function () {
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns(null);
            
            expect(ghostStats.initConfig()).to.be.true;
        });

        it('should handle missing configuration gracefully', function () {
            expect(ghostStats.initConfig()).to.be.false;
            
            mockDocument.currentScript = null;
            expect(ghostStats.initConfig()).to.be.false;
        });

        it('should process global attributes', async function () {
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            mockDocument.currentScript.attributes = [
                {name: 'tb_attr1', value: 'value1'},
                {name: 'tb_attr2', value: 'value2'}
            ];
            
            ghostStats.initConfig();
            await ghostStats.trackEvent('test', {});
            
            const payload = JSON.parse(mockFetch.lastCall.args[1].body);
            expect(payload.payload).to.include('attr1');
            expect(payload.payload).to.include('value1');
        });
    });

    describe('GhostStats Event Tracking', function () {
        beforeEach(function () {
            setupMockConfig();
        });

        it('should send requests with proper authentication headers', async function () {
            await ghostStats.trackEvent('test_event', {data: 'test'});

            expectRequestStructure({
                headers: {
                    'Content-Type': 'application/json',
                    'x-site-uuid': 'test-site-uuid'
                },
                method: 'POST'
            });
        });

        it('should track custom events with user data', async function () {
            const eventData = {customField: 'test_value', numericField: 123};
            await ghostStats.trackEvent('custom_event', eventData);
            
            expectRequestToContain(eventData);
            
            const {payload} = getLastRequest();
            expect(payload.action).to.equal('custom_event');
        });

        it('should track page hits with browser and location context', function () {
            ghostStats.trackPageHit();
            
            // Execute the delayed callback to simulate the debounced tracking
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            expectRequestToContain({
                'user-agent': 'test-agent',
                pathname: '/test',
                href: 'https://example.com/test',
                locale: 'en-US',
                location: 'US'
            });
            
            const {payload} = getLastRequest();
            expect(payload.action).to.equal('page_hit');
        });

        it('should include referrer and UTM tracking data in page hits', function () {
            // Set up URL with UTM parameters to test parsing
            mockWindow.location.href = 'https://example.com/test?utm_source=test-source&utm_medium=test-medium&utm_campaign=test-campaign&utm_term=test-term&utm_content=test-content';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const payload = getLastPayload();
            
            // Verify referrer structure exists and has expected fields
            expect(payload.parsedReferrer).to.be.an('object');
            expect(payload.parsedReferrer).to.have.all.keys(['url', 'source', 'medium']);
            
            // Verify UTM fields are present at top level
            expect(payload).to.include({
                utm_source: 'test-source',
                utm_medium: 'test-medium',
                utm_campaign: 'test-campaign',
                utm_term: 'test-term',
                utm_content: 'test-content'
            });
        });

        it('should handle network errors gracefully', async function () {
            mockFetch.rejects(new Error('Network error'));
            const consoleSpy = sandbox.spy(console, 'error');
            
            mockWindow.location.hostname = 'localhost';
            await ghostStats.trackEvent('test_event', {});
            
            expect(consoleSpy.calledOnce).to.be.true;
            consoleSpy.restore();
        });

        it('should send properly structured analytics payloads', async function () {
            const testEventData = {
                custom_field: 'test_value',
                numeric_field: 123
            };
            
            await ghostStats.trackEvent('custom_event', testEventData);
            
            expectRequestStructure({
                url: 'https://test.com?name=analytics_events&token=test-token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-site-uuid': 'test-site-uuid'
                },
                payloadFields: ['action', 'payload', 'timestamp']
            });
            
            const {payload} = getLastRequest();
            const innerPayload = getLastPayload();
            
            // Validate payload structure and content
            expect(payload.action).to.equal('custom_event');
            expect(payload.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(innerPayload).to.include(testEventData);
            expect(innerPayload).to.have.property('site_uuid', 'test-site-uuid');
            
            // Custom events should not include page-specific data
            expect(innerPayload).to.not.have.any.keys(['user-agent', 'pathname', 'href']);
        });

        it('should send complete page hit analytics data', function () {
            // Set up URL with UTM parameters to test parsing
            mockWindow.location.href = 'https://example.com/test?utm_source=test-source&utm_medium=test-medium&utm_campaign=test-campaign&utm_term=test-term&utm_content=test-content';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const {payload} = getLastRequest();
            const innerPayload = getLastPayload();
            
            expect(payload.action).to.equal('page_hit');
            
            // Verify all required page hit data is present
            const requiredPageFields = [
                'user-agent', 'pathname', 'href', 'parsedReferrer', 
                'locale', 'location', 'site_uuid', 'event_id'
            ];
            requiredPageFields.forEach((field) => {
                expect(innerPayload).to.have.property(field);
            });
            
            // Verify UTM tracking fields are present
            expect(innerPayload).to.include({
                utm_source: 'test-source',
                utm_medium: 'test-medium',
                utm_campaign: 'test-campaign',
                utm_term: 'test-term',
                utm_content: 'test-content'
            });
            
            // Verify data types
            expect(innerPayload['user-agent']).to.be.a('string');
            expect(innerPayload.pathname).to.be.a('string');
            expect(innerPayload.href).to.be.a('string');
            expect(innerPayload.parsedReferrer).to.be.a('object');
            expect(innerPayload.locale).to.be.a('string');
            expect(innerPayload.location).to.be.a('string');
            expect(innerPayload.event_id).to.be.a('string');
            
            // Verify referrer structure is clean (no UTM fields)
            expect(innerPayload.parsedReferrer).to.have.all.keys(['url', 'source', 'medium']);
            expect(innerPayload.parsedReferrer).to.not.have.any.keys(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']);
        });

        it('should handle missing token gracefully', async function () {
            setupMockConfig(createMockConfig({token: null}));
            await ghostStats.trackEvent('test', {});

            const {url} = getLastRequest();
            expect(url).to.equal('https://test.com?name=analytics_events');
        });

        it('should handle network timeouts gracefully', async function () {
            mockFetch.rejects(new Error('Request timeout'));
            
            const result = await ghostStats.trackEvent('test_event', {});
            expect(result).to.be.null;
            expect(mockFetch.calledOnce).to.be.true;
        });

        it('should handle HTTP error responses gracefully', async function () {
            mockFetch.resolves({ok: false, status: 500});
            
            const result = await ghostStats.trackEvent('test_event', {});
            expect(result).to.be.null;
            expect(mockFetch.calledOnce).to.be.true;
        });
    });

    describe('GhostStats Location Detection', function () {
        it('should detect locale and country correctly', function () {
            const info = ghostStats.getLocationInfo();
            expect(info).to.deep.equal({
                locale: 'en-US',
                country: 'US'
            });
        });

        it('should handle missing language preferences', function () {
            mockWindow.navigator.languages = undefined;
            mockWindow.navigator.language = 'en';
            
            const info = ghostStats.getLocationInfo();
            expect(info).to.deep.equal({
                locale: 'en',
                country: 'US'
            });
        });

        it('should handle timezone resolution errors', function () {
            mockWindow.Intl.DateTimeFormat = () => { 
                throw new Error(); 
            };
            
            const info = ghostStats.getLocationInfo();
            expect(info).to.deep.equal({
                locale: 'en',
                country: null
            });
        });
    });

    describe('GhostStats Event Listeners', function () {
        beforeEach(function () {
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            ghostStats.initConfig();
        });

        it('should handle visibility changes', async function () {
            mockDocument.visibilityState = 'hidden';
            ghostStats.setupEventListeners();
            expect(mockDocument.addEventListener.calledWith('visibilitychange')).to.be.true;

            const visibilityCallback = mockDocument.addEventListener.firstCall.args[1];
            mockDocument.visibilityState = 'visible';
            await visibilityCallback();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            await timeoutCallback();
            
            expect(mockFetch.calledOnce).to.be.true;
            const payload = JSON.parse(mockFetch.firstCall.args[1].body);
            expect(payload.action).to.equal('page_hit');
        });

        it('should not attach listeners multiple times', function () {
            ghostStats.setupEventListeners();
            const firstCallCount = mockWindow.addEventListener.callCount;

            // Call setupEventListeners multiple times
            ghostStats.setupEventListeners();
            ghostStats.setupEventListeners();

            // Verify no additional listeners were attached
            expect(mockWindow.addEventListener.callCount).to.equal(firstCallCount);
        });

        it('should maintain single visibility change listener when called multiple times', function () {
            mockDocument.visibilityState = 'hidden';
            
            ghostStats.setupEventListeners();
            const firstVisibilityListenerCount = mockDocument.addEventListener.withArgs('visibilitychange').callCount;

            // Call setupEventListeners again
            ghostStats.setupEventListeners();

            expect(mockDocument.addEventListener.withArgs('visibilitychange').callCount)
                .to.equal(firstVisibilityListenerCount);
        });
    });

    describe('GhostStats Initialization', function () {
        it('should initialize successfully with proper configuration', function () {
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');

            expect(ghostStats.init()).to.be.true;
            expect(mockWindow.Tinybird).to.exist;
            expect(typeof mockWindow.Tinybird.trackEvent).to.equal('function');
        });

        it('should skip initialization when in an iframe', function () {
            // Configure with valid settings
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            
            // Simulate being in an iframe (window.self !== window.top)
            const originalSelf = mockWindow.self;
            const originalTop = mockWindow.top;
            mockWindow.self = mockWindow;
            mockWindow.top = {different: 'window'}; // Different from self
            
            expect(ghostStats.init()).to.be.false;
            expect(mockWindow.Tinybird).to.not.exist;
            
            // Restore original values
            mockWindow.self = originalSelf;
            mockWindow.top = originalTop;
        });

        it('should initialize when NOT in an iframe', function () {
            // Configure with valid settings
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            
            // Simulate NOT being in an iframe (window.self === window.top)
            mockWindow.self = mockWindow;
            mockWindow.top = mockWindow; // Same as self
            
            expect(ghostStats.init()).to.be.true;
            expect(mockWindow.Tinybird).to.exist;
            expect(typeof mockWindow.Tinybird.trackEvent).to.equal('function');
        });

        it('should handle missing configuration gracefully', function () {
            expect(ghostStats.init()).to.be.false;
        });

        it('should set up global Tinybird API when initialized', function () {
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');

            ghostStats.init();

            expect(mockWindow.Tinybird).to.exist;
            expect(typeof mockWindow.Tinybird.trackEvent).to.equal('function');
            expect(typeof mockWindow.Tinybird._trackPageHit).to.equal('function');

            // Test the global API works
            mockWindow.Tinybird.trackEvent('test', {data: 'value'});
            expect(mockFetch.calledOnce).to.be.true;
        });
    });

    describe('GhostStats UUID Generation', function () {
        it('should generate a valid UUID', function () {
            const uuid = ghostStats.generateUUID();
            expect(uuid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        it('should generate a valid UUID with fallback', function () {
            mockWindow.crypto = undefined;

            const uuid = ghostStats.generateUUID();
            expect(uuid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });
    });

    describe('GhostStats Referrer Parsing', function () {
        beforeEach(function () {
            setupMockConfig();
        });

        it('should extract and separate referrer and UTM data from URL parameters', function () {
            mockDocument.referrer = '';
            mockWindow.location.href = 'https://example.com/test?ref=ghost-newsletter&utm_source=twitter&utm_medium=social&utm_campaign=test-campaign&utm_term=test-term&utm_content=test-content';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const innerPayload = getLastPayload();
            
            // Verify referrer data is properly structured
            expect(innerPayload.parsedReferrer).to.deep.include({
                source: 'ghost-newsletter',
                medium: 'social'
            });
            
            // Verify UTM data is at top level
            expect(innerPayload).to.include({
                utm_source: 'twitter',
                utm_medium: 'social',
                utm_campaign: 'test-campaign',
                utm_term: 'test-term',
                utm_content: 'test-content'
            });
        });

        it('should handle document referrer when no URL parameters exist', function () {
            mockDocument.referrer = 'https://example.com/internal-page';
            mockWindow.location.href = 'https://example.com/test';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const innerPayload = getLastPayload();
            
            // Should preserve document referrer
            expect(innerPayload.parsedReferrer.url).to.equal('https://example.com/internal-page');
            
            // UTM fields should still be present and null
            expect(innerPayload).to.include({
                utm_source: null,
                utm_medium: null,
                utm_campaign: null,
                utm_term: null,
                utm_content: null
            });
        });

        it('should handle missing referrer gracefully', function () {
            mockDocument.referrer = '';
            mockWindow.location.href = 'https://example.com/test';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const innerPayload = getLastPayload();
            
            // Should still have referrer structure
            expect(innerPayload.parsedReferrer).to.be.an('object');
            expect(innerPayload.parsedReferrer).to.have.all.keys(['url', 'source', 'medium']);
            
            // UTM fields should be present and null
            expect(innerPayload).to.include({
                utm_source: null,
                utm_medium: null,
                utm_campaign: null,
                utm_term: null,
                utm_content: null
            });
        });
    });
});