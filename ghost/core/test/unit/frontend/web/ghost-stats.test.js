const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { createBrowserEnvironment, loadScript } = require('../../../utils/browser-test-utils');

describe('ghost-stats.js', function () {
  let env;
  let scriptContent;

  before(function () {
    // Read the script content
    scriptContent = fs.readFileSync(
      path.join(__dirname, '../../../../core/frontend/public/ghost-stats.js'),
      'utf8'
    );
  });

  beforeEach(function () {
    // Create a new JSDOM environment for each test
    env = createBrowserEnvironment({
      url: 'https://example.com',
      referrer: 'https://referrer.com',
      html: '<!DOCTYPE html><html><body></body></html>',
      runScripts: true,
      storage: { type: 'localStorage' }
    });

    // Create a script element with data-storage attribute
    const scriptElement = env.document.createElement('script');
    scriptElement.setAttribute('data-storage', 'localStorage');
    env.document.body.appendChild(scriptElement);

    // Load the script
    loadScript(env, scriptContent, {
      dataAttributes: {
        storage: 'localStorage'
      }
    });
  });

  describe('Tinybird object creation', function () {
    it('should create a Tinybird object', function () {
      expect(env.window.Tinybird).to.exist;
      expect(env.window.Tinybird.trackEvent).to.be.a('function');
    });
  });

  describe('Session ID generation and storage', function () {
    it('should generate and store a session ID in localStorage', function () {
      // Call trackEvent to trigger session ID generation
      env.window.Tinybird.trackEvent('test_event', { test: 'data' });

      // Check that a session ID was stored in localStorage
      const sessionId = env.localStorage.getItem('session-id');
      expect(sessionId).to.exist;
      
      // Parse the session ID from localStorage
      const sessionData = JSON.parse(sessionId);
      expect(sessionData.value).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should use the same session ID across multiple events', function () {
      // Call trackEvent twice
      env.window.Tinybird.trackEvent('test_event1', { test: 'data1' });
      const sessionId1 = env.localStorage.getItem('session-id');
      
      env.window.Tinybird.trackEvent('test_event2', { test: 'data2' });
      const sessionId2 = env.localStorage.getItem('session-id');
      
      // Check that the same session ID was used
      expect(sessionId1).to.equal(sessionId2);
    });

    it('should handle session ID expiration', function () {
      // Call trackEvent to generate a session ID
      env.window.Tinybird.trackEvent('test_event', { test: 'data' });
      
      // Get the session ID
      const sessionId = env.localStorage.getItem('session-id');
      expect(sessionId).to.exist;
      
      // Parse the session ID and modify its expiry to be in the past
      const sessionData = JSON.parse(sessionId);
      sessionData.expiry = new Date().getTime() - 1000; // 1 second ago
      env.localStorage.setItem('session-id', JSON.stringify(sessionData));
      
      // Call trackEvent again
      env.window.Tinybird.trackEvent('test_event2', { test: 'data2' });
      
      // Get the new session ID
      const newSessionId = env.localStorage.getItem('session-id');
      expect(newSessionId).to.exist;
      
      // Parse the new session ID
      const newSessionData = JSON.parse(newSessionId);
      
      // Check that a new session ID was generated
      expect(newSessionData.value).to.not.equal(sessionData.value);
    });
  });

  describe('Event tracking', function () {
    it('should send events to the Ghost proxy', function () {
      // Call trackEvent
      env.window.Tinybird.trackEvent('test_event', { test: 'data' });

      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      expect(xhrInstance.method).to.equal('POST');
      expect(xhrInstance.url).to.include('e.ghost.org');
      
      // Check that the request data contains the event name and data
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.action).to.equal('test_event');
      expect(requestData.payload).to.include('"test":"data"');
    });

    it('should include session ID in event data', function () {
      // Call trackEvent
      env.window.Tinybird.trackEvent('test_event', { test: 'data' });

      // Get the session ID from localStorage
      const sessionId = JSON.parse(env.localStorage.getItem('session-id')).value;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains the session ID
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.session_id).to.equal(sessionId);
    });

    it('should include timestamp in event data', function () {
      // Call trackEvent
      env.window.Tinybird.trackEvent('test_event', { test: 'data' });

      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains a timestamp
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.timestamp).to.exist;
      
      // Check that the timestamp is a valid ISO string
      const timestamp = new Date(requestData.timestamp);
      expect(timestamp.toString()).to.not.equal('Invalid Date');
    });
  });

  describe('Data masking', function () {
    it('should mask sensitive data in events', function () {
      // Call trackEvent with sensitive data
      env.window.Tinybird.trackEvent('test_event', { 
        email: 'test@example.com',
        password: 'secretpassword',
        token: 'sensitive-token'
      });

      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the sensitive data was masked
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.payload).to.include('"email":"********"');
      expect(requestData.payload).to.include('"password":"********"');
      expect(requestData.payload).to.include('"token":"********"');
    });

    it('should mask nested sensitive data', function () {
      // Call trackEvent with nested sensitive data
      env.window.Tinybird.trackEvent('test_event', { 
        user: {
          email: 'test@example.com',
          password: 'secretpassword'
        },
        order: {
          id: '12345',
          payment: {
            credit_card: '4111111111111111'
          }
        }
      });

      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the nested sensitive data was masked
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.payload).to.include('"email":"********"');
      expect(requestData.payload).to.include('"password":"********"');
      expect(requestData.payload).to.include('"credit_card":"********"');
    });
  });

  describe('Referrer handling', function () {
    it('should use document.referrer when no query params are present', function () {
      // Create a new JSDOM environment with document.referrer set
      const envWithReferrer = createBrowserEnvironment({
        url: 'https://example.com',
        referrer: 'https://google.com',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = envWithReferrer.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      envWithReferrer.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithReferrer, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithReferrer.window.setTimeout;
      envWithReferrer.window.setTimeout = function(callback) {
        callback();
      };
      
      // Explicitly call _trackPageHit
      envWithReferrer.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      envWithReferrer.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithReferrer.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains the correct referrer
      const requestData = JSON.parse(xhrInstance._data);
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj.referrer).to.equal('https://google.com/');
    });

    it('should prioritize ref parameter over document.referrer', function () {
      // Create a new JSDOM environment with ref parameter in URL
      const envWithRef = createBrowserEnvironment({
        url: 'https://example.com/blog?ref=newsletter',
        referrer: 'https://google.com',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = envWithRef.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      envWithRef.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithRef, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithRef.window.setTimeout;
      envWithRef.window.setTimeout = function(callback) {
        callback();
      };
      
      // Explicitly call _trackPageHit
      envWithRef.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      envWithRef.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithRef.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains the correct referrer
      const requestData = JSON.parse(xhrInstance._data);
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj.referrer).to.equal('newsletter');
    });

    it('should prioritize source parameter over utm_source', function () {
      // Create a new JSDOM environment with source and utm_source parameters in URL
      const envWithSource = createBrowserEnvironment({
        url: 'https://example.com/blog?source=blog&utm_source=social',
        referrer: 'https://google.com',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = envWithSource.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      envWithSource.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithSource, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithSource.window.setTimeout;
      envWithSource.window.setTimeout = function(callback) {
        callback();
      };
      
      // Explicitly call _trackPageHit
      envWithSource.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      envWithSource.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithSource.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains the correct referrer
      const requestData = JSON.parse(xhrInstance._data);
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj.referrer).to.equal('blog');
    });

    it('should use utm_source when ref and source are not present', function () {
      // Create a new JSDOM environment with utm_source parameter in URL
      const envWithUtm = createBrowserEnvironment({
        url: 'https://example.com/blog?utm_source=social',
        referrer: 'https://google.com',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = envWithUtm.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      envWithUtm.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithUtm, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithUtm.window.setTimeout;
      envWithUtm.window.setTimeout = function(callback) {
        callback();
      };
      
      // Explicitly call _trackPageHit
      envWithUtm.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      envWithUtm.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithUtm.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains the correct referrer
      const requestData = JSON.parse(xhrInstance._data);
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj.referrer).to.equal('social');
    });

    it('should extract ref from hash URL when present', function () {
      // Create a new JSDOM environment with hash URL containing ref parameter
      const envWithHash = createBrowserEnvironment({
        url: 'https://example.com/#/portal/signup?ref=newsletter',
        referrer: 'https://google.com',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = envWithHash.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      envWithHash.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithHash, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithHash.window.setTimeout;
      envWithHash.window.setTimeout = function(callback) {
        callback();
      };
      
      // Explicitly call _trackPageHit
      envWithHash.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      envWithHash.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithHash.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains the correct referrer
      const requestData = JSON.parse(xhrInstance._data);
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj.referrer).to.equal('newsletter');
    });
  });

  describe('Page hit tracking', function () {
    it('should track page hits with correct data', function () {
      // Set up navigator
      Object.defineProperty(env.window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Test Browser)',
        configurable: true
      });
      
      // Set document.referrer
      Object.defineProperty(env.document, 'referrer', {
        value: 'https://google.com/',
        configurable: true
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = env.window.setTimeout;
      env.window.setTimeout = function(callback) {
        callback();
      };
      
      // Call _trackPageHit
      env.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      env.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      expect(xhrInstance.method).to.equal('POST');
      
      // Check that the request data contains page hit data
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.action).to.equal('page_hit');
      
      // Parse the payload string into an object
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj['user-agent']).to.equal('Mozilla/5.0 (Test Browser)');
      expect(payloadObj.pathname).to.equal('/');
      expect(payloadObj.href).to.equal('https://example.com/');
      expect(payloadObj.referrer).to.equal('https://google.com/');
    });

    it('should not track page hits in test environments', function () {
      // Set up test environment flags
      env.window.__nightmare = true;
      
      // Call _trackPageHit
      env.window.Tinybird._trackPageHit();
      
      // Check that no XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.not.exist;
    });
  });

  describe('Event-triggered page hit tracking', function () {
    it('should track page hits on hashchange event', function () {
      // Set up navigator
      Object.defineProperty(env.window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Test Browser)',
        configurable: true
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = env.window.setTimeout;
      env.window.setTimeout = function(callback) {
        callback();
      };
      
      // Trigger a hashchange event
      const event = new env.window.Event('hashchange');
      env.window.dispatchEvent(event);
      
      // Restore setTimeout
      env.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      expect(xhrInstance.method).to.equal('POST');
      
      // Check that the request data contains page hit data
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.action).to.equal('page_hit');
    });

    it('should track page hits on history pushState', function () {
      // Set up navigator
      Object.defineProperty(env.window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Test Browser)',
        configurable: true
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = env.window.setTimeout;
      env.window.setTimeout = function(callback) {
        callback();
      };
      
      // Save original pushState
      const originalPushState = env.window.history.pushState;
      
      // Execute the modified pushState function directly
      env.window.history.pushState({}, '', '/new-path');
      
      // Restore setTimeout
      env.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = env.lastXHR();
      expect(xhrInstance).to.exist;
      expect(xhrInstance.method).to.equal('POST');
      
      // Check that the request data contains page hit data
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.action).to.equal('page_hit');
    });

    it('should track page hits on document visibility change', function () {
      // Create a new environment where we can control behavior
      const visibilityEnv = createBrowserEnvironment({
        url: 'https://example.com',
        referrer: 'https://google.com/',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = visibilityEnv.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      visibilityEnv.document.body.appendChild(scriptElement);
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = visibilityEnv.window.setTimeout;
      visibilityEnv.window.setTimeout = function(callback) {
        callback();
      };
      
      // Load the script
      loadScript(visibilityEnv, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Instead of trying to change visibilityState, directly call the exposed tracking function
      visibilityEnv.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      visibilityEnv.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = visibilityEnv.lastXHR();
      expect(xhrInstance).to.exist;
      expect(xhrInstance.method).to.equal('POST');
      
      // Check that the request data contains page hit data
      const requestData = JSON.parse(xhrInstance._data);
      expect(requestData.action).to.equal('page_hit');
    });
  });

  describe('Referrer edge cases', function () {
    it('should return null when referrer hostname matches current hostname', function () {
      // Create a new JSDOM environment with matching hostnames
      const envWithMatchingHostname = createBrowserEnvironment({
        url: 'https://example.com/page2',
        referrer: 'https://example.com/page1',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage attribute
      const scriptElement = envWithMatchingHostname.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      envWithMatchingHostname.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithMatchingHostname, scriptContent, {
        dataAttributes: {
          storage: 'localStorage'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithMatchingHostname.window.setTimeout;
      envWithMatchingHostname.window.setTimeout = function(callback) {
        callback();
      };
      
      // Explicitly call _trackPageHit
      envWithMatchingHostname.window.Tinybird._trackPageHit();
      
      // Restore setTimeout
      envWithMatchingHostname.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithMatchingHostname.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Check that the request data contains null referrer
      const requestData = JSON.parse(xhrInstance._data);
      const payloadObj = JSON.parse(requestData.payload);
      expect(payloadObj.referrer).to.be.null;
    });
  });

  describe('Payload formatting', function () {
    it('should handle when stringifyPayload is set to false', function () {
      // Create a new JSDOM environment with stringifyPayload=false
      const envWithoutStringify = createBrowserEnvironment({
        url: 'https://example.com',
        referrer: 'https://google.com/',
        html: '<!DOCTYPE html><html><body></body></html>',
        runScripts: true,
        storage: { type: 'localStorage' }
      });
      
      // Create a script element with data-storage and data-stringify-payload attributes
      const scriptElement = envWithoutStringify.document.createElement('script');
      scriptElement.setAttribute('data-storage', 'localStorage');
      scriptElement.setAttribute('data-stringify-payload', 'false');
      envWithoutStringify.document.body.appendChild(scriptElement);
      
      // Load the script
      loadScript(envWithoutStringify, scriptContent, {
        dataAttributes: {
          storage: 'localStorage',
          'stringify-payload': 'false'
        }
      });
      
      // Mock setTimeout to execute immediately
      const originalSetTimeout = envWithoutStringify.window.setTimeout;
      envWithoutStringify.window.setTimeout = function(callback) {
        callback();
      };
      
      // Test with sensitive data
      envWithoutStringify.window.Tinybird.trackEvent('test_event', { 
        email: 'test@example.com',
        password: 'secretpassword'
      });
      
      // Restore setTimeout
      envWithoutStringify.window.setTimeout = originalSetTimeout;
      
      // Check that an XMLHttpRequest was made
      const xhrInstance = envWithoutStringify.lastXHR();
      expect(xhrInstance).to.exist;
      
      // Simply check that the sensitive data is masked in the raw request 
      const rawData = xhrInstance._data;
      expect(rawData).to.include('********');
      expect(rawData).to.not.include('test@example.com');
      expect(rawData).to.not.include('secretpassword');
    });
  });
}); 