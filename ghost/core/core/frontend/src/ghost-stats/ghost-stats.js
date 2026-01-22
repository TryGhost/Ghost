import { getCountryForTimezone } from 'countries-and-timezones';
import { getReferrer, parseReferrerData } from '../utils/url-attribution';
import { processPayload } from '../utils/privacy';
import { BrowserService } from './browser-service';

/**
 * @typedef {Object} TinybirdApi
 * @property {function} trackEvent - Function to track custom events
 * @property {function} _trackPageHit - Internal function to track page hits
 */

// Configuration constants
const DEFAULT_DATASOURCE = 'analytics_events';

// Runtime configuration
let config = {
    host: null,
    token: null,
    domain: null,
    datasource: DEFAULT_DATASOURCE,
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
        config.token = currentScript.getAttribute('data-token') || null;
        config.domain = currentScript.getAttribute('data-domain');
        
        // Get optional parameters
        config.datasource = currentScript.getAttribute('data-datasource') || config.datasource;
        config.stringifyPayload = currentScript.getAttribute('data-stringify-payload') !== 'false';
        
        // Get global attributes
        for (const attr of currentScript.attributes) {
            if (attr.name.startsWith('tb_')) {
                config.globalAttributes[attr.name.slice(3)] = attr.value;
            }
        }

        // Validate required configuration
        return !!(config.host);
    }

    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback to a simple UUID generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async trackEvent(name, payload) {
        try {
            // Check if we have required configuration
            // Token is optional — if using the analytics service, it will set the token itself
            if (!config.host) {
                throw new Error('Missing required configuration (host)');
            }

            let url = `${config.host}?name=${encodeURIComponent(config.datasource)}`;
            if (config.token) {
                url += `&token=${encodeURIComponent(config.token)}`;
            }
            payload.event_id = this.generateUUID();

            // Process the payload, masking sensitive data
            const processedPayload = processPayload(payload, config.globalAttributes, config.stringifyPayload);

            // Prepare request data
            const data = {
                timestamp: new Date().toISOString(),
                action: name,
                version: '1',
                payload: processedPayload,
            };

            // Use fetch with timeout for better error handling
            const controller = new AbortController();
            const timeoutId = this.browser.setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const headers = {
                'Content-Type': 'application/json',
            };
            if (config.globalAttributes?.site_uuid) {
                headers['x-site-uuid'] = config.globalAttributes.site_uuid;
            }

            const response = await this.browser.fetch(url, {
                method: 'POST',
                headers,
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

        const referrerData = parseReferrerData(location?.href);
        // WORKAROUND: The downstream referrer-parser library requires the 'url' field to be populated
        // even when attribution comes from query params (e.g., ?ref=ghost-newsletter) with no document.referrer.
        // We use getReferrer() to get the primary attribution source and fall back to document.referrer.
        // This means 'url' might contain non-URL values like "ghost-newsletter" when there's no actual referrer.
        // TODO: Refactor the referrer-parser to handle query param attribution without requiring this hack.
        referrerData.url = getReferrer(location?.href) || referrerData.url;

        // Debounce tracking to avoid duplicates and ensure page has settled
        this.browser.setTimeout(() => {
            this.trackEvent('page_hit', {
                'user-agent': navigator?.userAgent,
                locale,
                location: country,
                parsedReferrer: {
                    url: referrerData.url,
                    source: referrerData.source,
                    medium: referrerData.medium,
                },
                pathname: location?.pathname,
                href: location?.href,
                utm_source: referrerData.utmSource,
                utm_medium: referrerData.utmMedium,
                utm_campaign: referrerData.utmCampaign,
                utm_term: referrerData.utmTerm,
                utm_content: referrerData.utmContent
            });
        }, 300);
    }

    setupEventListeners() {
        if (this.isListenersAttached) {
            return;
        }

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

        // Skip if page is loaded in an iframe (admin preview, embeds, etc.)
        if (this.browser.window && this.browser.window.self !== this.browser.window.top) {
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