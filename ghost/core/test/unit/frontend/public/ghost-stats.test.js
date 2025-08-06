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
        it('should detect test environments correctly', function () {
            expect(browserService.isTestEnvironment()).to.be.false;

            Object.defineProperty(mockWindow, 'Cypress', {
                value: {},
                configurable: true
            });
            expect(browserService.isTestEnvironment()).to.be.true;
            delete mockWindow.Cypress;

            Object.defineProperty(mockWindow, '__nightmare', {
                value: true,
                configurable: true
            });
            expect(browserService.isTestEnvironment()).to.be.true;
            delete mockWindow.__nightmare;

            Object.defineProperty(mockWindow.navigator, 'webdriver', {
                value: true,
                configurable: true
            });
            expect(browserService.isTestEnvironment()).to.be.true;
        });

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
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            mockDocument.currentScript.attributes = [
                {name: 'tb_site_uuid', value: 'test-site-uuid'}
            ];
            ghostStats.initConfig();
        });

        it('should set the x-site-uuid header', async function () {
            await ghostStats.trackEvent('test_event', {data: 'test'});

            expect(mockFetch.calledOnce).to.be.true;
            expect(mockFetch.firstCall.args[1].headers['x-site-uuid']).to.equal('test-site-uuid');
        });

        it('should track custom events with correct data', async function () {
            await ghostStats.trackEvent('test_event', {data: 'test'});
            
            expect(mockFetch.calledOnce).to.be.true;
            const payload = JSON.parse(mockFetch.firstCall.args[1].body);
            expect(payload.action).to.equal('test_event');
            expect(payload.payload).to.include('test');
        });

        it('should track page hits with location info', function () {
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            expect(mockFetch.calledOnce).to.be.true;
            const payload = JSON.parse(mockFetch.firstCall.args[1].body);
            expect(payload.action).to.equal('page_hit');
            expect(JSON.parse(payload.payload)).to.deep.include({
                'user-agent': 'test-agent',
                pathname: '/test',
                href: 'https://example.com/test',
                locale: 'en-US',
                location: 'US'
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

        it('should send payload with correct shape and required fields', async function () {
            const testEventData = {
                custom_field: 'test_value',
                numeric_field: 123
            };
            
            await ghostStats.trackEvent('custom_event', testEventData);
            
            expect(mockFetch.calledOnce).to.be.true;
            
            // Verify request structure
            const [url, options] = mockFetch.firstCall.args;
            expect(url).to.equal('https://test.com?name=analytics_events&token=test-token');
            expect(options.method).to.equal('POST');
            expect(options.headers['Content-Type']).to.equal('application/json');
            expect(options.headers['x-site-uuid']).to.equal('test-site-uuid');
            
            // Parse and validate payload structure
            const payload = JSON.parse(options.body);
            
            // Required top-level fields
            expect(payload).to.have.property('action');
            expect(payload).to.have.property('payload');
            expect(payload).to.have.property('timestamp');
            
            // Validate field types
            expect(payload.action).to.be.a('string');
            expect(payload.payload).to.be.a('string');
            expect(payload.timestamp).to.be.a('string');
            
            // Validate action matches expected value
            expect(payload.action).to.equal('custom_event');
            
            // Validate timestamp is ISO format
            expect(() => new Date(payload.timestamp)).to.not.throw();
            expect(new Date(payload.timestamp).toISOString()).to.equal(payload.timestamp);
            
            // Parse inner payload and validate structure
            const innerPayload = JSON.parse(payload.payload);
            
            // Should contain custom event data
            expect(innerPayload).to.have.property('custom_field', 'test_value');
            expect(innerPayload).to.have.property('numeric_field', 123);
            
            // Should contain global attributes from script tag
            expect(innerPayload).to.have.property('site_uuid', 'test-site-uuid');
            
            // Custom events do not automatically include browser/location info
            // That is only added for page_hit events in trackPageHit()
            expect(innerPayload).to.not.have.property('user-agent');
            expect(innerPayload).to.not.have.property('pathname');
            expect(innerPayload).to.not.have.property('href');
        });

        it('should send page hit payload with correct shape', function () {
            ghostStats.trackPageHit();
            
            // Execute the delayed callback
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            expect(mockFetch.calledOnce).to.be.true;
            
            const [, options] = mockFetch.firstCall.args;
            const payload = JSON.parse(options.body);
            const innerPayload = JSON.parse(payload.payload);
            
            // Page hit specific validations
            expect(payload.action).to.equal('page_hit');
            
            // Should contain all required page hit fields
            expect(innerPayload).to.have.property('user-agent');
            expect(innerPayload).to.have.property('pathname');
            expect(innerPayload).to.have.property('href');
            expect(innerPayload).to.have.property('parsedReferrer');
            expect(innerPayload).to.have.property('locale');
            expect(innerPayload).to.have.property('location');
            expect(innerPayload).to.have.property('site_uuid');
            
            // Validate field types for page hit
            expect(innerPayload['user-agent']).to.be.a('string');
            expect(innerPayload.pathname).to.be.a('string');
            expect(innerPayload.href).to.be.a('string');
            expect(innerPayload.parsedReferrer).to.be.a('object');
            expect(innerPayload.locale).to.be.a('string');
            expect(innerPayload.location).to.be.a('string');
            expect(innerPayload.site_uuid).to.be.a('string');
            expect(innerPayload.event_id).to.be.a('string');
        });

        it('should handle missing token gracefully', async function () {
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns(null);
            ghostStats.initConfig();
            await ghostStats.trackEvent('test', {});

            expect(mockFetch.calledOnce).to.be.true;
            
            // Verify request structure
            const [url] = mockFetch.firstCall.args;
            expect(url).to.equal('https://test.com?name=analytics_events');
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

        it('should setup navigation tracking', function () {
            ghostStats.setupEventListeners();
            
            expect(mockWindow.addEventListener.calledWith('hashchange')).to.be.true;
            expect(mockWindow.addEventListener.calledWith('popstate')).to.be.true;
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
            const firstCallCounts = {
                hashchange: mockWindow.addEventListener.withArgs('hashchange').callCount,
                popstate: mockWindow.addEventListener.withArgs('popstate').callCount,
                pushState: mockWindow.history.pushState.callCount
            };

            // Call setupEventListeners multiple times
            ghostStats.setupEventListeners();
            ghostStats.setupEventListeners();

            // Verify no additional listeners were attached
            expect(mockWindow.addEventListener.withArgs('hashchange').callCount).to.equal(firstCallCounts.hashchange);
            expect(mockWindow.addEventListener.withArgs('popstate').callCount).to.equal(firstCallCounts.popstate);
            expect(mockWindow.history.pushState.callCount).to.equal(firstCallCounts.pushState);
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

        it('should skip initialization in test environments', function () {
            // Make it a test environment
            Object.defineProperty(mockWindow, 'Cypress', {
                value: {},
                configurable: true
            });

            expect(ghostStats.init()).to.be.false;
            mockWindow.Cypress = undefined;
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
            mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
            mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
            mockDocument.currentScript.attributes = [
                {name: 'tb_site_uuid', value: 'test-site-uuid'}
            ];
            ghostStats.initConfig();
        });

        it('should parse query string referrer parameters', function () {
            mockDocument.referrer = '';
            mockWindow.location.href = 'https://example.com/test?ref=ghost-newsletter&utm_source=twitter&utm_medium=social';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const payload = JSON.parse(mockFetch.firstCall.args[1].body);
            const innerPayload = JSON.parse(payload.payload);
            
            expect(innerPayload.parsedReferrer.source).to.equal('ghost-newsletter');
            expect(innerPayload.parsedReferrer.medium).to.equal('social');
        });

        it('should preserve document referrer when getReferrer returns null', function () {
            // Test the fix where referrerData.url is preserved when getReferrer returns null
            mockDocument.referrer = 'https://example.com/internal-page';
            mockWindow.location.href = 'https://example.com/test';
            
            ghostStats.trackPageHit();
            
            const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
            timeoutCallback();
            
            const payload = JSON.parse(mockFetch.firstCall.args[1].body);
            const innerPayload = JSON.parse(payload.payload);
            
            // Should preserve the original referrer URL even if it's from the same domain
            expect(innerPayload.parsedReferrer.url).to.equal('https://example.com/internal-page');
        });
    });
});