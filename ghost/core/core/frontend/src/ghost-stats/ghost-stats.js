import { v4 as uuidv4 } from 'uuid';
import timezoneData from '@tryghost/timezone-data';
import { getReferrer, parseReferrer } from '../utils/url-attribution';
import { getSessionId, setSessionId, getStorageObject } from '../utils/session-storage';
import { processPayload } from '../utils/privacy';

/**
 * @typedef {Object} TinybirdApi
 * @property {function} trackEvent - Function to track custom events
 * @property {function} _trackPageHit - Internal function to track page hits
 */

(function(){
    // Configuration constants
    const STORAGE_KEY = 'session-id';
    const DEFAULT_DATASOURCE = 'analytics_events';
    const storageMethods = {
        localStorage: 'localStorage',
        sessionStorage: 'sessionStorage',
    };
    
    // Runtime configuration (will be set during initialization)
    let config = {
        host: null,
        token: null,
        domain: null,
        datasource: DEFAULT_DATASOURCE,
        storageMethod: storageMethods.localStorage,
        stringifyPayload: true,
        globalAttributes: {}
    };

    // Detect test environment
    // @ts-ignore - Custom window properties for test environments
    const isTestEnv = !!(
        typeof window !== 'undefined' && (
            window.__nightmare || 
            window.navigator.webdriver || 
            window.Cypress
        )
    );

    /**
     * Initialize configuration from script attributes
     * @returns {boolean} Whether required configuration is present
     */
    function _initConfig() {
        if (!document.currentScript) {
            return false;
        }

        // Get required parameters
        config.host = document.currentScript.getAttribute('data-host');
        config.token = document.currentScript.getAttribute('data-token');
        config.domain = document.currentScript.getAttribute('data-domain');
        
        // Get optional parameters
        config.datasource = document.currentScript.getAttribute('data-datasource') || config.datasource;
        config.storageMethod = document.currentScript.getAttribute('data-storage') || config.storageMethod;
        config.stringifyPayload = document.currentScript.getAttribute('data-stringify-payload') !== 'false';
        
        // Get global attributes
        for (const attr of document.currentScript.attributes) {
            if (attr.name.startsWith('tb_')) {
                config.globalAttributes[attr.name.slice(3)] = attr.value;
            }
        }

        // Validate required configuration
        return !!(config.host && config.token);
    }

    /**
     * Send event to endpoint
     *
     * @param  {string} name Event name
     * @param  {object} payload Event payload
     * @return {Promise<any>} request response
     */
    async function _sendEvent(name, payload) {
        try {
            // Check if we have required configuration
            if (!config.host || !config.token) {
                throw new Error('Missing required configuration (host or token)');
            }

            // Set or update session ID
            setSessionId(STORAGE_KEY, getStorageObject(config.storageMethod));
            const url = `${config.host}?name=${encodeURIComponent(config.datasource)}&token=${encodeURIComponent(config.token)}`;

            // Process the payload, masking sensitive data
            const processedPayload = processPayload(payload, config.globalAttributes, config.stringifyPayload);
            const session_id = getSessionId(STORAGE_KEY, getStorageObject(config.storageMethod)) || uuidv4();

            // Prepare request data
            const data = {
                timestamp: new Date().toISOString(),
                action: name,
                version: '1',
                session_id,
                payload: processedPayload,
            };

            // Use fetch with timeout for better error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            // Silently fail for tracking errors
            // Only log in non-production environments
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.error('Ghost Stats error:', error);
            }
            return null;
        }
    }

    /**
     * Get browser locale and country information
     * @returns {Object} Object containing locale and country
     */
    function _getLocationInfo() {
        try {
            // Get timezone and map to country
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const country = timezone ? timezoneData[timezone] : null;
            
            // Get locale, falling back gracefully
            const locale = navigator.languages?.[0] || navigator.language || 'en';
            
            return { country, locale };
        } catch (error) {
            return { country: null, locale: 'en' };
        }
    }

    /**
     * Track page hit
     */
    function _trackPageHit() {
        // Skip tracking in test environments
        if (isTestEnv) {
            return;
        }

        // Get location information
        const { country, locale } = _getLocationInfo();

        // Wait a bit for SPA routers
        setTimeout(() => {
            _sendEvent('page_hit', {
                'user-agent': window.navigator.userAgent,
                locale,
                location: country,
                referrer: getReferrer(window.location.href),
                parsedReferrer: parseReferrer(window.location.href),
                pathname: window.location.pathname,
                href: window.location.href,
            });
        }, 300);
    }

    /**
     * Initialize tracking
     * @returns {boolean} Whether initialization was successful
     */
    function _init() {
        // Skip in test environments
        if (isTestEnv) {
            return false;
        }

        // Initialize configuration
        const configInitialized = _initConfig();
        if (!configInitialized) {
            console.warn('Ghost Stats: Missing required configuration');
            return false;
        }

        // Expose global API
        // @ts-ignore - Adding custom property to window
        window.Tinybird = { 
            trackEvent: _sendEvent,
            _trackPageHit: _trackPageHit
        };

        // Track history navigation
        window.addEventListener('hashchange', _trackPageHit);
        
        // Handle SPA navigation
        const originalPushState = window.history.pushState;
        if (originalPushState) {
            window.history.pushState = function() {
                originalPushState.apply(this, arguments);
                _trackPageHit();
            };
            window.addEventListener('popstate', _trackPageHit);
        }

        // Handle visibility changes for prerendering
        if (document.visibilityState !== 'hidden') {
            // Page is initially visible, track immediately
            _trackPageHit();
        } else {
            // Page is hidden (possibly prerendering), wait for visibility
            document.addEventListener('visibilitychange', function onVisibilityChange() {
                if (document.visibilityState === 'visible') {
                    _trackPageHit();
                    document.removeEventListener('visibilitychange', onVisibilityChange);
                }
            });
        }

        return true;
    }

    // Initialize tracking
    _init();
})(); 