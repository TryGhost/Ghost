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
        this.tinybirdConfig = tinybirdConfig;
        this.siteUuid = tinybirdConfig.stats?.id || siteUuid;

        // Flags for determining which token to use
        // We should aim to simplify this in the future
        this.isJwtEnabled = !!tinybirdConfig.workspaceId && !!tinybirdConfig.adminToken;
        this.isLocalEnabled = !!tinybirdConfig.stats?.local?.enabled;
        this.isStatsEnabled = !!tinybirdConfig.stats?.token;
        this._serverToken = null;
    }

    /**
     * Gets the server token, refreshing it if it's about to expire
     * We're moving towards using JWT tokens for all Tinybird requests
     * For now we need to remain backwards compatible with the old stats token
     * @returns {string|null} The server token or null if generation fails
     */
    getServerToken() {
        // Prefer JWT tokens if enabled
        if (this.isJwtEnabled) {
            // Generate a new JWT token if it doesn't exist or is expired
            if (!this._serverToken || this._isJWTExpired(this._serverToken)) {
                this._serverToken = this._generateServerToken();
            }
            return this._serverToken;
        }
        // If local stats are enabled, use the local token
        if (this.isLocalEnabled) {
            return this.tinybirdConfig.stats.local?.token;
        }
        // If stats are enabled, use the stats token
        if (this.isStatsEnabled) {
            return this.tinybirdConfig.stats.token;
        }
        // If no token is available, return null
        return null;
    }

    getFrontendToken() {
        if (this.isJwtEnabled) {
            return this._generateTinybirdJWT({name: 'ghost-frontend-token-' + this.siteUuid, expiresInMinutes: 30});
        }
        if (this.isLocalEnabled) {
            return this.tinybirdConfig.stats.local?.token;
        }
        if (this.isStatsEnabled) {
            return this.tinybirdConfig.stats.token;
        }
        return null;
    }

    /**
     * Generates a server token with 60-minute expiration
     * @returns {string} The generated server token
     * @private
     */
    _generateServerToken() {
        return this._generateTinybirdJWT({name: 'ghost-server-token-' + this.siteUuid, expiresInMinutes: 60});
    }

    /**
     * Generates a Tinybird JWT token with specified options
     * @param {JWTGenerationOptions} [options={}] - Token generation options
     * @returns {string} The signed JWT token
     * @private
     */
    _generateTinybirdJWT({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 30} = {}) {
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

        return jwt.sign(payload, this.tinybirdConfig.adminToken, {noTimestamp: true});
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