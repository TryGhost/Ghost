const assert = require('node:assert/strict');
const sinon = require('sinon');
const { assertExists, assertObjectMatches } = require('../../../utils/assertions');
const { BrowserService } = require('../../../../core/frontend/src/ghost-stats/browser-service.js');

// ghost-stats.js auto-runs init() at module load. Outside a browser there's no
// config, so it logs an expected "Missing required configuration" warning on
// import. Suppress that one-time load-side-effect warning so it isn't noise.
const importWarnStub = sinon.stub(console, 'warn');
const { GhostStats } = require('../../../../core/frontend/src/ghost-stats/ghost-stats.js');
importWarnStub.restore();

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
    ...overrides,
  });

  const setupMockConfig = (config = createMockConfig()) => {
    mockDocument.currentScript.getAttribute.withArgs('data-host').returns(config.host);
    mockDocument.currentScript.getAttribute.withArgs('data-token').returns(config.token);
    mockDocument.currentScript.attributes = [{ name: 'tb_site_uuid', value: config.siteUuid }];
    ghostStats.initConfig();
  };

  const assertIsObject = (value) => {
    assert.equal(typeof value, 'object');
    assert.notEqual(value, null);
  };

  const assertHasAllKeys = (obj, keys) => {
    assert.deepEqual(Object.keys(obj).sort(), [...keys].sort());
  };

  const assertHasNoKeys = (obj, keys) => {
    for (const key of keys) {
      assert.equal(Object.hasOwn(obj, key), false, `Unexpected key "${key}"`);
    }
  };

  const getLastRequest = () => {
    assert.equal(mockFetch.called, true);
    const [url, options] = mockFetch.lastCall.args;
    return { url, options, payload: JSON.parse(options.body) };
  };

  const getLastPayload = () => {
    const { payload } = getLastRequest();
    return JSON.parse(payload.payload);
  };

  const expectRequestToContain = (expectedFields) => {
    const { payload } = getLastRequest();
    const innerPayload = JSON.parse(payload.payload);

    Object.entries(expectedFields).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        assertObjectMatches(innerPayload[key], value);
      } else {
        assert.equal(innerPayload[key], value);
      }
    });
  };

  const expectRequestStructure = (expectedStructure) => {
    const { url, options, payload } = getLastRequest();

    if (expectedStructure.url) {
      assert.equal(url.includes(expectedStructure.url), true);
    }
    if (expectedStructure.method) {
      assert.equal(options.method, expectedStructure.method);
    }
    if (expectedStructure.headers) {
      Object.entries(expectedStructure.headers).forEach(([key, value]) => {
        assert.equal(options.headers[key], value);
      });
    }
    if (expectedStructure.payloadFields) {
      expectedStructure.payloadFields.forEach((field) => {
        assert.equal(field in payload, true);
      });
    }
  };

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // Setup mock fetch
    mockFetch = sandbox.stub().resolves({ ok: true });

    // Setup mock storage
    mockStorage = {
      getItem: sandbox.stub(),
      setItem: sandbox.stub(),
      removeItem: sandbox.stub(),
      length: 0,
      clear: sandbox.stub(),
      key: sandbox.stub(),
    };

    // Setup mock document with minimal required properties
    mockDocument = {
      currentScript: {
        getAttribute: sandbox.stub(),
        attributes: [],
      },
      visibilityState: 'visible',
      addEventListener: sandbox.stub(),
      removeEventListener: sandbox.stub(),
      referrer: 'https://example.com',
    };

    // Setup mock window with minimal required properties
    mockWindow = {
      location: {
        hostname: 'example.com',
        pathname: '/test',
        href: 'https://example.com/test',
      },
      navigator: {
        userAgent: 'test-agent',
        languages: ['en-US'],
        language: 'en-US',
        webdriver: false,
      },
      history: {
        pushState: sandbox.stub(),
      },
      addEventListener: sandbox.stub(),
      removeEventListener: sandbox.stub(),
      setTimeout: sandbox.stub().returns(123),
      clearTimeout: sandbox.stub(),
      Intl: {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({
            timeZone: 'America/New_York',
          }),
        }),
      },
      fetch: mockFetch,
      localStorage: mockStorage,
      sessionStorage: mockStorage,
      document: mockDocument,
    };

    // Make sure document.referrer is accessible via window.document.referrer
    mockWindow.document = mockDocument;

    // Setup global mocks for url-attribution.js
    global.window = mockWindow;
    global.document = mockDocument;
    global.localStorage = mockStorage;
    global.sessionStorage = mockStorage;

    // Create browser service instance with mocks
    browserService = new BrowserService(mockWindow, mockDocument);

    // Create GhostStats instance with mocked browser service
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
        configurable: true,
      });
      assert.equal(browserService.isTestEnvironment(), true);

      // Enable synthetic monitoring flag - should bypass test detection
      Object.defineProperty(mockWindow, '__GHOST_SYNTHETIC_MONITORING__', {
        value: true,
        configurable: true,
      });
      assert.equal(browserService.isTestEnvironment(), false);

      // Clean up
      delete mockWindow.__GHOST_SYNTHETIC_MONITORING__;
      delete mockWindow.navigator.webdriver;
    });

    it('should handle browser APIs safely', function () {
      assert.equal(browserService.getNavigator(), mockWindow.navigator);
      assert.equal(browserService.getLocation(), mockWindow.location);
      assert.equal(browserService.getTimezone(), 'America/New_York');
      assert.equal(browserService.getCurrentScript(), mockDocument.currentScript);
      assert.equal(browserService.getVisibilityState(), 'visible');
    });

    it('should manage event listeners correctly', function () {
      const callback = () => {};
      browserService.addEventListener('window', 'test', callback);
      assert.equal(
        mockWindow.addEventListener.called &&
          mockWindow.addEventListener.firstCall.args[0] === 'test' &&
          mockWindow.addEventListener.firstCall.args[1] === callback,
        true,
      );

      browserService.addEventListener('document', 'test', callback);
      assert.equal(
        mockDocument.addEventListener.called &&
          mockDocument.addEventListener.firstCall.args[0] === 'test' &&
          mockDocument.addEventListener.firstCall.args[1] === callback,
        true,
      );

      browserService.removeEventListener('window', 'test', callback);
      assert.equal(
        mockWindow.removeEventListener.called &&
          mockWindow.removeEventListener.firstCall.args[0] === 'test' &&
          mockWindow.removeEventListener.firstCall.args[1] === callback,
        true,
      );
    });
  });

  describe('GhostStats Configuration', function () {
    it('should initialize with host and token', function () {
      mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
      mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');

      assert.equal(ghostStats.initConfig(), true);
    });

    it('should initialize with host and no token', function () {
      mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
      mockDocument.currentScript.getAttribute.withArgs('data-token').returns(null);

      assert.equal(ghostStats.initConfig(), true);
    });

    it('should handle missing configuration gracefully', function () {
      assert.equal(ghostStats.initConfig(), false);

      mockDocument.currentScript = null;
      assert.equal(ghostStats.initConfig(), false);
    });

    it('should process global attributes', async function () {
      mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
      mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');
      mockDocument.currentScript.attributes = [
        { name: 'tb_attr1', value: 'value1' },
        { name: 'tb_attr2', value: 'value2' },
      ];

      ghostStats.initConfig();
      await ghostStats.trackEvent('test', {});

      const payload = JSON.parse(mockFetch.lastCall.args[1].body);
      assert.equal(payload.payload.includes('attr1'), true);
      assert.equal(payload.payload.includes('value1'), true);
    });
  });

  describe('GhostStats Event Tracking', function () {
    beforeEach(function () {
      setupMockConfig();
    });

    it('should send requests with proper authentication headers', async function () {
      await ghostStats.trackEvent('test_event', { data: 'test' });

      expectRequestStructure({
        headers: {
          'Content-Type': 'application/json',
          'x-site-uuid': 'test-site-uuid',
        },
        method: 'POST',
      });
    });

    it('should track custom events with user data', async function () {
      const eventData = { customField: 'test_value', numericField: 123 };
      await ghostStats.trackEvent('custom_event', eventData);

      expectRequestToContain(eventData);

      const { payload } = getLastRequest();
      assert.equal(payload.action, 'custom_event');
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
        location: 'US',
      });

      const { payload } = getLastRequest();
      assert.equal(payload.action, 'page_hit');
    });

    it('should include referrer and UTM tracking data in page hits', function () {
      // Set up URL with UTM parameters to test parsing
      mockWindow.location.href =
        'https://example.com/test?utm_source=test-source&utm_medium=test-medium&utm_campaign=test-campaign&utm_term=test-term&utm_content=test-content';

      ghostStats.trackPageHit();

      const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
      timeoutCallback();

      const payload = getLastPayload();

      // Verify referrer structure exists and has expected fields
      assertIsObject(payload.parsedReferrer);
      assertHasAllKeys(payload.parsedReferrer, ['url', 'source', 'medium']);

      // Verify UTM fields are present at top level
      assertObjectMatches(payload, {
        utm_source: 'test-source',
        utm_medium: 'test-medium',
        utm_campaign: 'test-campaign',
        utm_term: 'test-term',
        utm_content: 'test-content',
      });
    });

    it('should handle network errors gracefully', async function () {
      const networkError = new Error('Network error');
      mockFetch.rejects(networkError);
      const consoleSpy = sandbox.stub(console, 'error');

      mockWindow.location.hostname = 'localhost';
      await ghostStats.trackEvent('test_event', {});

      assert.equal(consoleSpy.calledOnce, true);
      assert.equal(consoleSpy.calledWith('Ghost Stats error:', networkError), true);
    });

    it('should send properly structured analytics payloads', async function () {
      const testEventData = {
        custom_field: 'test_value',
        numeric_field: 123,
      };

      await ghostStats.trackEvent('custom_event', testEventData);

      expectRequestStructure({
        url: 'https://test.com?name=analytics_events&token=test-token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-uuid': 'test-site-uuid',
        },
        payloadFields: ['action', 'payload', 'timestamp'],
      });

      const { payload } = getLastRequest();
      const innerPayload = getLastPayload();

      // Validate payload structure and content
      assert.equal(payload.action, 'custom_event');
      assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assertObjectMatches(innerPayload, testEventData);
      assert.equal(innerPayload.site_uuid, 'test-site-uuid');

      // Custom events should not include page-specific data
      assertHasNoKeys(innerPayload, ['user-agent', 'pathname', 'href']);
    });

    it('should send complete page hit analytics data', function () {
      // Set up URL with UTM parameters to test parsing
      mockWindow.location.href =
        'https://example.com/test?utm_source=test-source&utm_medium=test-medium&utm_campaign=test-campaign&utm_term=test-term&utm_content=test-content';

      ghostStats.trackPageHit();

      const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
      timeoutCallback();

      const { payload } = getLastRequest();
      const innerPayload = getLastPayload();

      assert.equal(payload.action, 'page_hit');

      // Verify all required page hit data is present
      const requiredPageFields = [
        'user-agent',
        'pathname',
        'href',
        'parsedReferrer',
        'locale',
        'location',
        'site_uuid',
        'event_id',
      ];
      requiredPageFields.forEach((field) => {
        assert.equal(field in innerPayload, true);
      });

      // Verify UTM tracking fields are present
      assertObjectMatches(innerPayload, {
        utm_source: 'test-source',
        utm_medium: 'test-medium',
        utm_campaign: 'test-campaign',
        utm_term: 'test-term',
        utm_content: 'test-content',
      });

      // Verify data types
      assert.equal(typeof innerPayload['user-agent'], 'string');
      assert.equal(typeof innerPayload.pathname, 'string');
      assert.equal(typeof innerPayload.href, 'string');
      assertIsObject(innerPayload.parsedReferrer);
      assert.equal(typeof innerPayload.locale, 'string');
      assert.equal(typeof innerPayload.location, 'string');
      assert.equal(typeof innerPayload.event_id, 'string');

      // Verify referrer structure is clean (no UTM fields)
      assertHasAllKeys(innerPayload.parsedReferrer, ['url', 'source', 'medium']);
      assertHasNoKeys(innerPayload.parsedReferrer, [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
      ]);
    });

    it('should handle missing token gracefully', async function () {
      setupMockConfig(createMockConfig({ token: null }));
      await ghostStats.trackEvent('test', {});

      const { url } = getLastRequest();
      assert.equal(url, 'https://test.com?name=analytics_events');
    });

    it('should handle network timeouts gracefully', async function () {
      mockFetch.rejects(new Error('Request timeout'));

      const result = await ghostStats.trackEvent('test_event', {});
      assert.equal(result, null);
      assert.equal(mockFetch.calledOnce, true);
    });

    it('should handle HTTP error responses gracefully', async function () {
      mockFetch.resolves({ ok: false, status: 500 });

      const result = await ghostStats.trackEvent('test_event', {});
      assert.equal(result, null);
      assert.equal(mockFetch.calledOnce, true);
    });
  });

  describe('GhostStats Location Detection', function () {
    it('should detect locale and country correctly', function () {
      const info = ghostStats.getLocationInfo();
      assert.deepEqual(info, {
        locale: 'en-US',
        country: 'US',
      });
    });

    it('should handle missing language preferences', function () {
      mockWindow.navigator.languages = undefined;
      mockWindow.navigator.language = 'en';

      const info = ghostStats.getLocationInfo();
      assert.deepEqual(info, {
        locale: 'en',
        country: 'US',
      });
    });

    it('should handle timezone resolution errors', function () {
      mockWindow.Intl.DateTimeFormat = () => {
        throw new Error();
      };

      const info = ghostStats.getLocationInfo();
      assert.deepEqual(info, {
        locale: 'en',
        country: null,
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
      assert.equal(mockDocument.addEventListener.calledWith('visibilitychange'), true);

      const visibilityCallback = mockDocument.addEventListener.firstCall.args[1];
      mockDocument.visibilityState = 'visible';
      await visibilityCallback();

      const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
      await timeoutCallback();

      assert.equal(mockFetch.calledOnce, true);
      const payload = JSON.parse(mockFetch.firstCall.args[1].body);
      assert.equal(payload.action, 'page_hit');
    });

    it('should not attach listeners multiple times', function () {
      ghostStats.setupEventListeners();
      const firstCallCount = mockWindow.addEventListener.callCount;

      // Call setupEventListeners multiple times
      ghostStats.setupEventListeners();
      ghostStats.setupEventListeners();

      // Verify no additional listeners were attached
      assert.equal(mockWindow.addEventListener.callCount, firstCallCount);
    });

    it('should maintain single visibility change listener when called multiple times', function () {
      mockDocument.visibilityState = 'hidden';

      ghostStats.setupEventListeners();
      const firstVisibilityListenerCount =
        mockDocument.addEventListener.withArgs('visibilitychange').callCount;

      // Call setupEventListeners again
      ghostStats.setupEventListeners();

      assert.equal(
        mockDocument.addEventListener.withArgs('visibilitychange').callCount,
        firstVisibilityListenerCount,
      );
    });
  });

  describe('GhostStats Initialization', function () {
    it('should initialize successfully with proper configuration', function () {
      mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
      mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');

      assert.equal(ghostStats.init(), true);
      assertExists(mockWindow.Tinybird);
      assert.equal(typeof mockWindow.Tinybird.trackEvent, 'function');
    });

    it('should skip initialization when in an iframe', function () {
      // Configure with valid settings
      mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
      mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');

      // Simulate being in an iframe (window.self !== window.top)
      const originalSelf = mockWindow.self;
      const originalTop = mockWindow.top;
      mockWindow.self = mockWindow;
      mockWindow.top = { different: 'window' }; // Different from self

      assert.equal(ghostStats.init(), false);
      assert.equal(mockWindow.Tinybird, undefined);

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

      assert.equal(ghostStats.init(), true);
      assertExists(mockWindow.Tinybird);
      assert.equal(typeof mockWindow.Tinybird.trackEvent, 'function');
    });

    it('should handle missing configuration gracefully', function () {
      const consoleWarnStub = sandbox.stub(console, 'warn');

      assert.equal(ghostStats.init(), false);

      assert.equal(
        consoleWarnStub.calledOnceWith('Ghost Stats: Missing required configuration'),
        true,
      );
    });

    it('should set up global Tinybird API when initialized', function () {
      mockDocument.currentScript.getAttribute.withArgs('data-host').returns('https://test.com');
      mockDocument.currentScript.getAttribute.withArgs('data-token').returns('test-token');

      ghostStats.init();

      assertExists(mockWindow.Tinybird);
      assert.equal(typeof mockWindow.Tinybird.trackEvent, 'function');
      assert.equal(typeof mockWindow.Tinybird._trackPageHit, 'function');

      // Test the global API works
      mockWindow.Tinybird.trackEvent('test', { data: 'value' });
      assert.equal(mockFetch.calledOnce, true);
    });
  });

  describe('GhostStats UUID Generation', function () {
    it('should generate a valid UUID', function () {
      const uuid = ghostStats.generateUUID();
      assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate a valid UUID with fallback', function () {
      mockWindow.crypto = undefined;

      const uuid = ghostStats.generateUUID();
      assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('GhostStats Referrer Parsing', function () {
    beforeEach(function () {
      setupMockConfig();
    });

    it('should extract and separate referrer and UTM data from URL parameters', function () {
      mockDocument.referrer = '';
      mockWindow.location.href =
        'https://example.com/test?ref=ghost-newsletter&utm_source=twitter&utm_medium=social&utm_campaign=test-campaign&utm_term=test-term&utm_content=test-content';

      ghostStats.trackPageHit();

      const timeoutCallback = mockWindow.setTimeout.firstCall.args[0];
      timeoutCallback();

      const innerPayload = getLastPayload();

      // Verify referrer data is properly structured
      assertObjectMatches(innerPayload.parsedReferrer, {
        source: 'ghost-newsletter',
        medium: 'social',
      });

      // Verify UTM data is at top level
      assertObjectMatches(innerPayload, {
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: 'test-campaign',
        utm_term: 'test-term',
        utm_content: 'test-content',
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
      assert.equal(innerPayload.parsedReferrer.url, 'https://example.com/internal-page');

      // UTM fields should still be present and null
      assertObjectMatches(innerPayload, {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
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
      assertIsObject(innerPayload.parsedReferrer);
      assertHasAllKeys(innerPayload.parsedReferrer, ['url', 'source', 'medium']);

      // UTM fields should be present and null
      assertObjectMatches(innerPayload, {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
      });
    });
  });
});
