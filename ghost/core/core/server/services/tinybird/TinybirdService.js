const jwt = require('jsonwebtoken');
const errors = require('@tryghost/errors');

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
        // TODO: deprecate local and stats tokens to simplify this logic once JWTs are rolled out completely
        this.isJwtEnabled = !!tinybirdConfig?.workspaceId && !!tinybirdConfig?.adminToken;
        this.isLocalEnabled = !!tinybirdConfig?.stats?.local?.enabled;
        this.isStatsEnabled = !!tinybirdConfig?.stats?.token;
        this._serverToken = null;
        this._serverTokenExp = null;
    }

    /**
     * Check if the service is enabled (has valid configuration)
     * Note: this checks if the Tinybird service itself is available based on the config
     * It does not check that the trafficAnalytics features/flags/settings are enabled
     * @returns {boolean} True if the service has necessary configuration to function
     */
    get isEnabled() {
        // Service needs at least one token type and a site UUID
        return !!(this.siteUuid && (this.isJwtEnabled || this.isLocalEnabled || this.isStatsEnabled));
    }

    /**
     * Gets a token for reading data from Tinybird API endpoints
     * We're moving towards using JWT tokens for all Tinybird requests
     * For now we need to remain backwards compatible with the old stats & local tokens
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
                token: this.tinybirdConfig?.stats?.local?.token
            };
        }
        // If stats are enabled, use the stats token
        if (this.isStatsEnabled) {
            return {
                token: this.tinybirdConfig?.stats?.token
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
        if (!this.isJwtEnabled) {
            throw new errors.IncorrectUsageError({
                message: 'Tinybird JWT tokens are not enabled',
                context: 'Please provide your Tinybird workspaceId and adminToken in Ghost\'s configuration'
            });
        }

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
 * Get the TinybirdService singleton instance
 * @param {Object} options
 * @param {boolean} [options.reset=false] - Reset the instance for testing
 * @returns {TinybirdService} The TinybirdService instance
 */
function getInstance({reset = false} = {}) {
    // Reset instance if requested (for testing)
    if (reset) {
        instance = null;
    }
    
    // Return existing instance if available
    if (instance) {
        return instance;
    }
    
    // Initialize new instance
    const config = require('../../../shared/config');
    const settingsCache = require('../../../shared/settings-cache');

    // Always create an instance, even if not configured
    instance = new TinybirdService({
        tinybirdConfig: config.get('tinybird') || {},
        siteUuid: settingsCache.get('site_uuid')
    });
    
    return instance;
}

module.exports = TinybirdService;
module.exports.getInstance = getInstance;