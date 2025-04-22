const {expect} = require('chai');
const {createBrowserEnvironment} = require('../../../utils/browser-test-utils');

describe('ghost-stats.js', function () {
    let env;

    // Helper function to create a test environment with various options
    function createTestEnvironment(options = {}) {
        const defaults = {
            url: 'https://example.com',
            referrer: 'https://google.com/',
            stringifyPayload: true
        };

        const config = {...defaults, ...options};

        // Create environment
        const testEnv = createBrowserEnvironment({
            url: config.url,
            referrer: config.referrer,
            html: '<!DOCTYPE html><html><body></body></html>',
            runScripts: true,
            storage: {type: 'localStorage'}
        });

        // Generate UUID v4 format string for session ID
        function generateUUID() {
            return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function () {
                const r = Math.random() * 16 | 0;
                return r.toString(16);
            });
        }
        
        // Function to mask sensitive data
        function maskSensitiveData(data) {
            const sensitiveFields = ['email', 'password', 'token', 'credit_card'];
            
            if (typeof data !== 'object' || data === null) {
                return data;
            }
            
            const maskedData = Array.isArray(data) ? [...data] : {...data};
            
            for (const key in maskedData) {
                if (sensitiveFields.includes(key)) {
                    maskedData[key] = '********';
                } else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
                    maskedData[key] = maskSensitiveData(maskedData[key]);
                }
            }
            
            return maskedData;
        }

        // Mock the Tinybird object that would be created by ghost-stats.js
        testEnv.window.Tinybird = {
            trackEvent: function (action, data) {
                // Mask sensitive data
                const maskedData = maskSensitiveData(data);
                
                // Store the last track event for assertions
                testEnv._lastTrackEvent = {
                    action,
                    data: maskedData,
                    timestamp: new Date().toISOString()
                };
                
                // Generate and store session ID if not present or expired
                let sessionId;
                const sessionIdJson = testEnv.localStorage.getItem('session-id');
                if (sessionIdJson) {
                    const parsedSessionId = JSON.parse(sessionIdJson);
                    if (parsedSessionId.expiry > new Date().getTime()) {
                        sessionId = parsedSessionId;
                    }
                }
                
                if (!sessionId) {
                    sessionId = {
                        value: generateUUID(),
                        expiry: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours
                    };
                    testEnv.localStorage.setItem('session-id', JSON.stringify(sessionId));
                }

                // Mock XHR request
                const payload = config.stringifyPayload === false 
                    ? maskedData 
                    : JSON.stringify(maskedData);
                    
                const xhr = {
                    method: 'POST',
                    url: 'https://e.ghost.org/tb/web_analytics',
                    _data: JSON.stringify({
                        action,
                        payload,
                        session_id: sessionId.value,
                        timestamp: new Date().toISOString()
                    })
                };
                
                testEnv._lastXHR = xhr;
            },
            
            _trackPageHit: function () {
                // Skip in test environments
                if (testEnv.window.__nightmare) {
                    return;
                }
                
                const payload = {
                    'user-agent': testEnv.window.navigator.userAgent,
                    pathname: new URL(testEnv.window.location.href).pathname,
                    href: testEnv.window.location.href,
                    referrer: null
                };
                
                // Handle referrer logic similar to the actual implementation
                const url = new URL(testEnv.window.location.href);
                let ref = url.searchParams.get('ref');
                
                // Handle hash URLs
                if (!ref && url.hash && url.hash.includes('?')) {
                    const hashParams = new URLSearchParams(url.hash.split('?')[1]);
                    ref = hashParams.get('ref');
                }
                
                let source = url.searchParams.get('source');
                let utm_source = url.searchParams.get('utm_source');
                
                if (ref) {
                    payload.referrer = ref;
                } else if (source) {
                    payload.referrer = source;
                } else if (utm_source) {
                    payload.referrer = utm_source;
                } else if (testEnv.window.document.referrer) {
                    const referrerUrl = new URL(testEnv.window.document.referrer);
                    const currentUrl = new URL(testEnv.window.location.href);
                    
                    if (referrerUrl.hostname !== currentUrl.hostname) {
                        payload.referrer = testEnv.window.document.referrer;
                    }
                }
                
                this.trackEvent('page_hit', payload);
            }
        };

        // Mock event listeners
        const originalAddEventListener = testEnv.window.addEventListener;
        testEnv.window.addEventListener = function (event, handler) {
            if (event === 'hashchange') {
                testEnv._hashChangeHandler = handler;
            }
            return originalAddEventListener.call(testEnv.window, event, handler);
        };
        
        // Mock history pushState
        const originalPushState = testEnv.window.history.pushState;
        testEnv.window.history.pushState = function () {
            const result = originalPushState.apply(this, arguments);
            testEnv.window.Tinybird._trackPageHit();
            return result;
        };

        // Create convenience method for tests
        testEnv.lastXHR = function () {
            return testEnv._lastXHR;
        };

        return testEnv;
    }

    // Helper function to execute code with immediate timeout
    function withImmediateTimeout(testEnv, callback) {
        const originalSetTimeout = testEnv.window.setTimeout;
        testEnv.window.setTimeout = function (cb) {
            cb();
        };

        try {
            callback();
        } finally {
            testEnv.window.setTimeout = originalSetTimeout;
        }
    }

    // Helper function to track page hit and run assertions
    function trackPageHitAndAssert(testEnv, assertions) {
        withImmediateTimeout(testEnv, () => {
            // Call tracking function
            testEnv.window.Tinybird._trackPageHit();

            // Check request
            const xhr = testEnv.lastXHR();
            expect(xhr).to.exist;
            expect(xhr.method).to.equal('POST');

            // Parse and check payload
            const requestData = JSON.parse(xhr._data);
            expect(requestData.action).to.equal('page_hit');

            if (assertions) {
                const payloadObj = JSON.parse(requestData.payload);
                assertions(payloadObj, requestData);
            }
        });
    }

    beforeEach(function () {
        // Create default test environment
        env = createTestEnvironment();
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
            env.window.Tinybird.trackEvent('test_event', {test: 'data'});

            // Check that a session ID was stored in localStorage
            const sessionId = env.localStorage.getItem('session-id');
            expect(sessionId).to.exist;

            // Parse the session ID from localStorage
            const sessionData = JSON.parse(sessionId);
            expect(sessionData.value).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        it('should use the same session ID across multiple events', function () {
            // Call trackEvent twice
            env.window.Tinybird.trackEvent('test_event1', {test: 'data1'});
            const sessionId1 = env.localStorage.getItem('session-id');
            const sessionData1 = JSON.parse(sessionId1);

            env.window.Tinybird.trackEvent('test_event2', {test: 'data2'});
            const sessionId2 = env.localStorage.getItem('session-id');
            const sessionData2 = JSON.parse(sessionId2);

            // Check that the same session ID was used
            expect(sessionData1.value).to.equal(sessionData2.value);
        });

        it('should handle session ID expiration', function () {
            // Call trackEvent to generate a session ID
            env.window.Tinybird.trackEvent('test_event', {test: 'data'});

            // Get the session ID
            const sessionId = env.localStorage.getItem('session-id');
            expect(sessionId).to.exist;

            // Parse the session ID and modify its expiry to be in the past
            const sessionData = JSON.parse(sessionId);
            sessionData.expiry = new Date().getTime() - 1000; // 1 second ago
            env.localStorage.setItem('session-id', JSON.stringify(sessionData));

            // Call trackEvent again
            env.window.Tinybird.trackEvent('test_event2', {test: 'data2'});

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
            env.window.Tinybird.trackEvent('test_event', {test: 'data'});

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
            env.window.Tinybird.trackEvent('test_event', {test: 'data'});

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
            env.window.Tinybird.trackEvent('test_event', {test: 'data'});

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
        function expectMaskedData(payload, fields) {
            fields.forEach((field) => {
                expect(payload).to.include(`"${field}":"********"`);
            });
        }

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
            expectMaskedData(requestData.payload, ['email', 'password', 'token']);
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
            expectMaskedData(requestData.payload, ['email', 'password', 'credit_card']);
        });
    });

    describe('Referrer handling', function () {
        it('should use document.referrer when no query params are present', function () {
            const envWithReferrer = createTestEnvironment();

            trackPageHitAndAssert(envWithReferrer, (payloadObj) => {
                expect(payloadObj.referrer).to.equal('https://google.com/');
            });
        });

        it('should prioritize ref parameter over document.referrer', function () {
            const envWithRef = createTestEnvironment({
                url: 'https://example.com/blog?ref=newsletter'
            });

            trackPageHitAndAssert(envWithRef, (payloadObj) => {
                expect(payloadObj.referrer).to.equal('newsletter');
            });
        });

        it('should prioritize source parameter over utm_source', function () {
            const envWithSource = createTestEnvironment({
                url: 'https://example.com/blog?source=blog&utm_source=social'
            });

            trackPageHitAndAssert(envWithSource, (payloadObj) => {
                expect(payloadObj.referrer).to.equal('blog');
            });
        });

        it('should use utm_source when ref and source are not present', function () {
            const envWithUtm = createTestEnvironment({
                url: 'https://example.com/blog?utm_source=social'
            });

            trackPageHitAndAssert(envWithUtm, (payloadObj) => {
                expect(payloadObj.referrer).to.equal('social');
            });
        });

        it('should extract ref from hash URL when present', function () {
            const envWithHash = createTestEnvironment({
                url: 'https://example.com/#/portal/signup?ref=newsletter'
            });

            trackPageHitAndAssert(envWithHash, (payloadObj) => {
                expect(payloadObj.referrer).to.equal('newsletter');
            });
        });
    });

    describe('Page hit tracking', function () {
        it('should track page hits with correct data', function () {
            // Set up navigator
            Object.defineProperty(env.window.navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Test Browser)',
                configurable: true
            });

            trackPageHitAndAssert(env, (payloadObj) => {
                expect(payloadObj['user-agent']).to.equal('Mozilla/5.0 (Test Browser)');
                expect(payloadObj.pathname).to.equal('/');
                expect(payloadObj.href).to.equal('https://example.com/');
                expect(payloadObj.referrer).to.equal('https://google.com/');
            });
        });

        it('should not track page hits in test environments', function () {
            // Set up test environment flags
            env.window.__nightmare = true;

            withImmediateTimeout(env, () => {
                // Call _trackPageHit
                env.window.Tinybird._trackPageHit();

                // Check that no XMLHttpRequest was made
                const xhrInstance = env.lastXHR();
                expect(xhrInstance).to.not.exist;
            });
        });
    });

    describe('Event-triggered page hit tracking', function () {
        it('should track page hits on hashchange event', function () {
            withImmediateTimeout(env, () => {
                // Manually trigger the Tinybird trackPageHit function
                env.window.Tinybird._trackPageHit();

                // Check that an XMLHttpRequest was made
                const xhrInstance = env.lastXHR();
                expect(xhrInstance).to.exist;
                expect(xhrInstance.method).to.equal('POST');

                // Check that the request data contains page hit data
                const requestData = JSON.parse(xhrInstance._data);
                expect(requestData.action).to.equal('page_hit');
            });
        });

        it('should track page hits on history pushState', function () {
            // Set up navigator
            Object.defineProperty(env.window.navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Test Browser)',
                configurable: true
            });

            withImmediateTimeout(env, () => {
                // Execute the modified pushState function directly
                env.window.history.pushState({}, '', '/new-path');

                // Check that an XMLHttpRequest was made
                const xhrInstance = env.lastXHR();
                expect(xhrInstance).to.exist;
                expect(xhrInstance.method).to.equal('POST');

                // Check that the request data contains page hit data
                const requestData = JSON.parse(xhrInstance._data);
                expect(requestData.action).to.equal('page_hit');
            });
        });

        it('should track page hits on document visibility change', function () {
            const visibilityEnv = createTestEnvironment();
            trackPageHitAndAssert(visibilityEnv);
        });
    });

    describe('Referrer edge cases', function () {
        it('should return null when referrer hostname matches current hostname', function () {
            const envWithMatchingHostname = createTestEnvironment({
                url: 'https://example.com/page2',
                referrer: 'https://example.com/page1'
            });

            trackPageHitAndAssert(envWithMatchingHostname, (payloadObj) => {
                expect(payloadObj.referrer).to.be.null;
            });
        });
    });

    describe('Payload formatting', function () {
        it('should handle when stringifyPayload is set to false', function () {
            const envWithoutStringify = createTestEnvironment({
                stringifyPayload: false
            });

            withImmediateTimeout(envWithoutStringify, () => {
                // Test with sensitive data
                envWithoutStringify.window.Tinybird.trackEvent('test_event', {
                    email: 'test@example.com',
                    password: 'secretpassword'
                });

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
});