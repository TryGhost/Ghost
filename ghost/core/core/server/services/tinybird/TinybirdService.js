const jwt = require('jsonwebtoken');

/**
 * @typedef {Object} TinybirdConfig
 * @property {string} workspaceId - The Tinybird workspace ID
 * @property {string} adminToken - The admin token for JWT signing
 * @property {Object} [stats] - Statistics configuration
 * @property {string} [stats.id] - Stats ID (deprecated)
 * @property {string} [stats.token] - Stats token (deprecated)
 * @property {string} [stats.endpoint] - Stats endpoint
 * @property {string} [stats.datasource] - Stats datasource
 * @property {Object} [stats.local] - Local stats configuration
 * @property {boolean} [stats.local.enabled] - Whether local stats are enabled
 * @property {string} [stats.local.token] - Local stats token
 * @property {string} [stats.local.endpoint] - Local stats endpoint
 * @property {string} [stats.local.datasource] - Local stats datasource
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
        this.tinybirdConfig = tinybirdConfig || {};
        this.siteUuid = tinybirdConfig?.stats?.id || siteUuid;

        // Flags for determining which token to use
        // We should aim to simplify this in the future
        this.isJwtEnabled = !!tinybirdConfig?.workspaceId && !!tinybirdConfig?.adminToken;
        this.isLocalEnabled = !!tinybirdConfig?.stats?.local?.enabled;
        this.isStatsEnabled = !!tinybirdConfig?.stats?.token;
        this._serverToken = null;
        this._serverTokenExp = null;
    }

    /**
     * Check if the service is enabled (has valid configuration)
     * @returns {boolean} True if the service has necessary configuration to function
     */
    get isEnabled() {
        // Service needs at least one token type and a site UUID
        return !!(this.siteUuid && (this.isJwtEnabled || this.isLocalEnabled || this.isStatsEnabled));
    }

    /**
     * Gets the server token, refreshing it if it's about to expire
     * We're moving towards using JWT tokens for all Tinybird requests
     * For now we need to remain backwards compatible with the old stats token
     * @returns {{token: string, exp?: number}|null} Object with token and optional exp, or null if generation fails
     */
    getToken({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 180} = {}) {
        // Return null if service is not enabled
        if (!this.isEnabled) {
            return null;
        }

        // Prefer JWT tokens if enabled
        if (this.isJwtEnabled) {
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
        }
        // If local stats are enabled, use the local token
        if (this.isLocalEnabled) {
            return {
                token: this.tinybirdConfig.stats.local?.token
            };
        }
        // If stats are enabled, use the stats token
        if (this.isStatsEnabled) {
            return {
                token: this.tinybirdConfig.stats.token
            };
        }
        // This shouldn't happen if isEnabled is true, but just in case
        return null;
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
}

// Static instance for singleton pattern
let instance = null;

/**
 * Initialize the TinybirdService singleton
 * This should be called once during boot in initServices()
 * It can also be called again to pick up configuration changes (e.g., in tests)
 * The instance is always created, but may be disabled if not properly configured
 */
function init() {
    const config = require('../../../shared/config');
    const settingsCache = require('../../../shared/settings-cache');

    // Always create an instance, even if not configured
    instance = new TinybirdService({
        tinybirdConfig: config.get('tinybird') || {},
        siteUuid: settingsCache.get('site_uuid')
    });
    
    return instance;
}

// Reset the instance for testing
function reset() {
    instance = null;
}

module.exports = TinybirdService;
module.exports.init = init;
module.exports.reset = reset;
module.exports.getInstance = () => {
    // Lazy initialization for cases where init() hasn't been called (e.g., unit tests)
    if (!instance) {
        init();
    }
    return instance;
};