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
    'api_top_locations',
    'api_top_pages',
    'api_top_sources',
    'api_top_utm_sources',
    'api_top_utm_mediums',
    'api_top_utm_campaigns',
    'api_top_utm_contents',
    'api_top_utm_terms',
    'api_top_devices',
    // v2 pipes (materialized view optimization)
    'api_kpis_v2',
    'api_active_visitors_v2',
    'api_post_visitor_counts_v2',
    'api_top_locations_v2',
    'api_top_pages_v2',
    'api_top_sources_v2',
    'api_top_utm_sources_v2',
    'api_top_utm_mediums_v2',
    'api_top_utm_campaigns_v2',
    'api_top_utm_contents_v2',
    'api_top_utm_terms_v2',
    'api_top_devices_v2'
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
        this.tinybirdConfig = tinybirdConfig;
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
     * Gets the server token, refreshing it if it's about to expire
     * We're moving towards using JWT tokens for all Tinybird requests
     * For now we need to remain backwards compatible with the old stats token
     * @returns {{token: string, exp?: number}|null} Object with token and optional exp, or null if generation fails
     */
    getToken({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 180} = {}) {
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
        // If no token is available, return null
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

module.exports = TinybirdService;