const jwt = require('jsonwebtoken');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

/**
 * @typedef {Object} TinybirdConfig
 * @property {string} [workspaceId] - The Tinybird workspace ID
 * @property {string} [adminToken] - The admin token for JWT signing
 * @property {Object} [tracker] - Tracker configuration
 * @property {string} [tracker.endpoint] - Tracker endpoint URL
 * @property {Object} [stats] - Statistics configuration
 * @property {string} [stats.overrideSiteUuid] - (optional) Site UUID override
 * @property {string} [stats.endpoint] - Statistics endpoint URL
 */

/**
 * @typedef {Object} TinybirdConstructorOptions
 * @property {TinybirdConfig} tinybirdConfig - Tinybird configuration object
 * @property {string} siteUuid - Unique identifier for the site
 */

/**
 * @typedef {Object} JWTGenerationOptions
 * @property {string} [name] - Name for the JWT token
 * @property {number} [expiresInMinutes] - Token expiration time in minutes
 */

/**
 * @typedef {Object} TinybirdScope
 * @property {string} type - The scope type (e.g., 'PIPES:READ')
 * @property {string} resource - The resource name/pipe name
 * @property {Object} fixed_params - Fixed parameters for the scope
 * @property {string} fixed_params.site_uuid - Site UUID parameter
 */

/**
 * @typedef {Object} TinybirdJWTPayload
 * @property {string} workspace_id - Tinybird workspace ID
 * @property {string} name - Token name
 * @property {number} exp - Expiration timestamp
 * @property {TinybirdScope[]} scopes - Array of permission scopes
 */

const TINYBIRD_PIPES = [
    'api_kpis',
    'api_active_visitors',
    'api_post_visitor_counts',
    'api_top_browsers',
    'api_top_devices',
    'api_top_locations',
    'api_top_os',
    'api_top_pages',
    'api_top_sources'
];

/**
 * Service for managing Tinybird JWT tokens and authentication
 */
class TinybirdService {
    /**
     * Creates a new TinybirdService instance
     * @param {TinybirdConstructorOptions} options - Configuration options
     */
    constructor({tinybirdConfig, siteUuid}) {
        // Validate configuration
        const validation = TinybirdService.validateConfig(tinybirdConfig);
        if (!validation.isValid) {
            throw new errors.ValidationError({
                message: `Invalid Tinybird configuration: ${validation.errors.join(', ')}`
            });
        }

        this.tinybirdConfig = tinybirdConfig;
        this.siteUuid = tinybirdConfig?.stats?.overrideSiteUuid || siteUuid;

        // JWT token info
        this._serverToken = null;
        this._serverTokenExp = null;
    }

    /**
     * Gets the server JWT token, refreshing it if it's about to expire
     * @returns {{token: string, exp?: number}|null} Object with token and optional exp, or null if generation fails
     */
    getToken({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 180} = {}) {
        try {
            // Generate a new JWT token if it doesn't exist or is expired
            if (!this._serverToken || this._isJWTExpired(this._serverToken)) {
                const tokenData = this._generateToken({name, expiresInMinutes});
                this._serverToken = tokenData.token;
                this._serverTokenExp = tokenData.exp;
            }
            return {
                token: this._serverToken,
                exp: this._serverTokenExp
            };
        } catch (error) {
            logging.error('Error getting Tinybird token', error);
            return null;
        }
    }

    /**
     * Generates a Tinybird JWT token with specified options
     * @param {JWTGenerationOptions} [options={}] - Token generation options
     * @returns {{token: string, exp: number}} Object containing the signed JWT token and expiration timestamp
     * @private
     */
    _generateToken({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 60} = {}) {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
        
        /** @type {TinybirdJWTPayload} */
        const payload = {
            workspace_id: this.tinybirdConfig.workspaceId,
            name,
            exp: expiresAt,
            scopes: TINYBIRD_PIPES.map((pipe) => {
                return {
                    type: 'PIPES:READ',
                    resource: pipe,
                    fixed_params: {
                        site_uuid: this.siteUuid
                    }
                };
            })
        };

        const token = jwt.sign(payload, this.tinybirdConfig.adminToken, {noTimestamp: true});
        
        return {
            token,
            exp: expiresAt
        };
    }

    /**
     * Checks if a JWT token is expired or will expire within the buffer time
     * @param {string|null} token - The JWT token to check
     * @param {number} [bufferSeconds=300] - Buffer time in seconds before expiration
     * @returns {boolean} True if token is expired or will expire soon, false otherwise
     * @private
     */
    _isJWTExpired(token, bufferSeconds = 300) {
        try {
            const decoded = jwt.verify(token, this.tinybirdConfig.adminToken);
            if (typeof decoded !== 'object' || !decoded.exp) {
                return true;
            }
            const now = Math.floor(Date.now() / 1000);
            const timeRemaining = decoded.exp - now;
            return timeRemaining < bufferSeconds;
        } catch (error) {
            return true;
        }
    }

    /**
     * Gets the appropriate tracker endpoint based on configuration
     * @returns {string|null} The tracker endpoint URL or null if not configured
     */
    getTrackerEndpoint() {
        return this.tinybirdConfig.tracker?.endpoint || null;
    }

    /**
     * Gets the appropriate stats endpoint based on configuration
     * @returns {string|null} The stats endpoint URL or null if not configured
     */
    getStatsEndpoint() {
        return this.tinybirdConfig.stats?.endpoint || null;
    }

    /**
     * Static method to validate Tinybird configuration
     * @param {TinybirdConfig} config - Ghost's config.tinybird object to validate
     * @returns {{isValid: boolean, errors: string[]}} Validation result
     */
    static validateConfig(config) {
        const validationErrors = [];

        if (!config) {
            validationErrors.push('Tinybird configuration is missing');
            return {isValid: false, errors: validationErrors};
        }

        // Validate remote configuration
        if (!config.workspaceId) {
            validationErrors.push('workspaceId is required');
        }
        if (!config.adminToken) {
            validationErrors.push('adminToken is required');
        }
        if (!config.tracker || !config.tracker.endpoint) {
            validationErrors.push('tracker.endpoint is required');
        }
        if (!config.stats || !config.stats.endpoint) {
            validationErrors.push('stats.endpoint is required');
        }

        return {
            isValid: validationErrors.length === 0,
            errors: validationErrors
        };
    }
}

module.exports = TinybirdService;
