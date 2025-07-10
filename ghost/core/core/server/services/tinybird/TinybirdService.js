const jwt = require('jsonwebtoken');
const errors = require('@tryghost/errors');

/**
 * @typedef {Object} TinybirdConfig
 * @property {string} [workspaceId] - The Tinybird workspace ID (required for remote configuration)
 * @property {string} [adminToken] - The admin token for JWT signing (required for remote configuration)
 * @property {Object} [tracker] - Tracker configuration (required for remote configuration)
 * @property {string} [tracker.endpoint] - Tracker endpoint URL (required for remote configuration)
 * @property {Object} [tracker.local] - Local tracker configuration
 * @property {boolean} [tracker.local.enabled] - Whether local tracker is enabled
 * @property {string} [tracker.local.endpoint] - Local tracker endpoint (required when tracker.local.enabled is true)
 * @property {Object} [stats] - Statistics configuration
 * @property {string} [stats.endpoint] - Stats endpoint
 * @property {Object} [stats.local] - Local stats configuration
 * @property {boolean} [stats.local.enabled] - Whether local stats are enabled
 * @property {string} [stats.local.token] - Local stats token
 * @property {string} [stats.local.endpoint] - Local stats endpoint (required when stats.local.enabled is true)
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
        this.siteUuid = tinybirdConfig?.stats?.id || siteUuid;

        // Flags for determining which token to use
        // We should aim to simplify this in the future
        this.isJwtEnabled = !!tinybirdConfig?.workspaceId && !!tinybirdConfig?.adminToken;
        this.isLocalEnabled = validation.isLocal;
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
        // If local mode is enabled, use the local token
        if (this.isLocalEnabled) {
            // Prefer tracker.local token if available, fallback to stats.local
            const localToken = this.tinybirdConfig.tracker?.local?.token || 
                             this.tinybirdConfig.stats?.local?.token;
            return {
                token: localToken
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

    /**
     * Gets the appropriate tracker endpoint based on configuration
     * @returns {string|null} The tracker endpoint URL or null if not configured
     */
    getTrackerEndpoint() {
        if (this.isLocalEnabled && this.tinybirdConfig.tracker?.local?.endpoint) {
            return this.tinybirdConfig.tracker.local.endpoint;
        }
        return this.tinybirdConfig.tracker?.endpoint || null;
    }

    /**
     * Gets the appropriate stats endpoint based on configuration
     * @returns {string|null} The stats endpoint URL or null if not configured
     */
    getStatsEndpoint() {
        if (this.isLocalEnabled && this.tinybirdConfig.stats?.local?.endpoint) {
            return this.tinybirdConfig.stats.local.endpoint;
        }
        return this.tinybirdConfig.stats?.endpoint || null;
    }

    /**
     * Static method to validate Tinybird configuration
     * @param {TinybirdConfig} config - Ghost's config.tinybird object to validate
     * @returns {{isValid: boolean, errors: string[], isLocal: boolean}} Validation result
     */
    static validateConfig(config) {
        const validationErrors = [];
        let isLocal = false;

        if (!config) {
            validationErrors.push('Tinybird configuration is missing');
            return {isValid: false, errors: validationErrors, isLocal};
        }

        // Check if local mode is enabled
        if (config.stats?.local?.enabled || config.tracker?.local?.enabled) {
            isLocal = true;
            
            // Validate local configuration
            if (config.stats?.local?.enabled) {
                if (!config.stats.local.token) {
                    validationErrors.push('Local stats token is required when local mode is enabled');
                }
                if (!config.stats.local.endpoint) {
                    validationErrors.push('Local stats endpoint is required when local mode is enabled');
                }
            }
            
            if (config.tracker?.local?.enabled) {
                if (!config.tracker.local.endpoint) {
                    validationErrors.push('Local tracker endpoint is required when local mode is enabled');
                }
            }
        } else {
            // Validate remote configuration
            if (!config.workspaceId) {
                validationErrors.push('workspaceId is required for remote configuration');
            }
            if (!config.adminToken) {
                validationErrors.push('adminToken is required for remote configuration');
            }
            if (!config.tracker || !config.tracker.endpoint) {
                validationErrors.push('tracker.endpoint is required for remote configuration');
            }
        }

        return {
            isValid: validationErrors.length === 0,
            errors: validationErrors,
            isLocal
        };
    }
}

module.exports = TinybirdService;
