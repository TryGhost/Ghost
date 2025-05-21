import { v4 as uuidv4 } from 'uuid';
import { getCountryForTimezone } from 'countries-and-timezones';
import { getReferrer, parseReferrer } from '../utils/url-attribution';
import { getSessionId, setSessionId, getStorageObject } from '../utils/session-storage';
import { processPayload } from '../utils/privacy';
import { BrowserService } from './browser-service';

/**
 * @typedef {Object} TinybirdApi
 * @property {function} trackEvent - Function to track custom events
 * @property {function} _trackPageHit - Internal function to track page hits
 */

// Configuration constants
const STORAGE_KEY = 'session-id';
const DEFAULT_DATASOURCE = 'analytics_events';
const STORAGE_METHODS = {
    localStorage: 'localStorage',
    sessionStorage: 'sessionStorage',
};

// Runtime configuration
let config = {
    host: null,
    token: null,
    domain: null,
    datasource: DEFAULT_DATASOURCE,
    storageMethod: STORAGE_METHODS.localStorage,
    stringifyPayload: true,
    globalAttributes: {}
};

export class GhostStats {
    constructor(browserService = new BrowserService()) {
        this.browser = browserService;
        this.isListenersAttached = false;
    }

    get isTestEnv() {
        return this.browser.isTestEnvironment();
    }

    initConfig() {
        const currentScript = this.browser.getCurrentScript();
        if (!currentScript) {
            return false;
        }

        // Get required parameters
        config.host = currentScript.getAttribute('data-host');
        config.token = currentScript.getAttribute('data-token');
        config.domain = currentScript.getAttribute('data-domain');
        
        // Get optional parameters
        config.datasource = currentScript.getAttribute('data-datasource') || config.datasource;
        config.storageMethod = currentScript.getAttribute('data-storage') || config.storageMethod;
        config.stringifyPayload = currentScript.getAttribute('data-stringify-payload') !== 'false';
        
        // Get global attributes
        for (const attr of currentScript.attributes) {
            if (attr.name.startsWith('tb_')) {
                config.globalAttributes[attr.name.slice(3)] = attr.value;
            }
        }

        // Validate required configuration
        return !!(config.host && config.token);
    }

    async trackEvent(name, payload) {
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
            const timeoutId = this.browser.setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await this.browser.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            this.browser.clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            // Silently fail for tracking errors
            // Only log in non-production environments
            const location = this.browser.getLocation();
            if (location?.hostname === 'localhost' || location?.hostname === '127.0.0.1') {
                console.error('Ghost Stats error:', error);
            }
            return null;
        }
    }

    getLocationInfo() {
        try {
            // Get timezone from browser
            const timezone = this.browser.getTimezone();
            // Get country from timezone using countries-and-timezones
            const countryData = timezone ? getCountryForTimezone(timezone) : null;
            // Get locale, falling back gracefully
            const navigator = this.browser.getNavigator();
            const locale = navigator?.languages?.[0] || navigator?.language || 'en';
            return { 
                country: countryData ? countryData.id : null,  // Returns country code
                locale 
            };
        } catch (error) {
            return { country: null, locale: 'en' };
        }
    }

    trackPageHit() {
        // Skip tracking in test environments
        if (this.isTestEnv) {
            return;
        }

        // Get location information
        const { country, locale } = this.getLocationInfo();
        const navigator = this.browser.getNavigator();
        const location = this.browser.getLocation();

        // Wait a bit for SPA routers
        this.browser.setTimeout(() => {
            this.trackEvent('page_hit', {
                'user-agent': navigator?.userAgent,
                locale,
                location: country,
                referrer: getReferrer(location?.href),
                parsedReferrer: parseReferrer(location?.href),
                pathname: location?.pathname,
                href: location?.href,
            });
        }, 300);
    }

    setupEventListeners() {
        if (this.isListenersAttached) {
            return;
        }

        // Track history navigation
        this.browser.addEventListener('window', 'hashchange', () => this.trackPageHit());
        
        // Handle SPA navigation
        this.browser.wrapHistoryMethod('pushState', () => this.trackPageHit());
        this.browser.addEventListener('window', 'popstate', () => this.trackPageHit());

        // Handle visibility changes for prerendering
        if (this.browser.getVisibilityState() !== 'hidden') {
            // Page is initially visible, track immediately
            this.trackPageHit();
        } else {
            // Page is hidden (possibly prerendering), wait for visibility
            const onVisibilityChange = () => {
                if (this.browser.getVisibilityState() === 'visible') {
                    this.trackPageHit();
                    this.browser.removeEventListener('document', 'visibilitychange', onVisibilityChange);
                }
            };
            this.browser.addEventListener('document', 'visibilitychange', onVisibilityChange);
        }

        this.isListenersAttached = true;
    }

    init() {
        // Skip in test environments
        if (this.isTestEnv) {
            return false;
        }

        // Initialize configuration
        const configInitialized = this.initConfig();
        if (!configInitialized) {
            console.warn('Ghost Stats: Missing required configuration');
            return false;
        }

        // Expose global API
        if (this.browser.window) {
            this.browser.window.Tinybird = { 
                trackEvent: (name, payload) => this.trackEvent(name, payload),
                _trackPageHit: () => this.trackPageHit()
            };
        }

        this.setupEventListeners();
        return true;
    }
}

// Create and initialize instance for auto-initialization
const ghostStats = new GhostStats();
ghostStats.init();

// Export bound methods to maintain this context
export const isTestEnv = () => ghostStats.isTestEnv;
export const initConfig = ghostStats.initConfig.bind(ghostStats);
export const trackEvent = ghostStats.trackEvent.bind(ghostStats);
export const getLocationInfo = ghostStats.getLocationInfo.bind(ghostStats);
export const trackPageHit = ghostStats.trackPageHit.bind(ghostStats);
export const setupEventListeners = ghostStats.setupEventListeners.bind(ghostStats);
export const init = ghostStats.init.bind(ghostStats);

// Also export the instance for testing
export const ghostStatsInstance = ghostStats; 