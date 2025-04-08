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
  });
}); 