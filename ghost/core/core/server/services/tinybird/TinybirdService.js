const jwt = require('jsonwebtoken');
const logging = require('@tryghost/logging');

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

class TinybirdService {
    constructor({workspaceId, adminToken, siteUuid}) {
        if (!workspaceId || !adminToken || !siteUuid) {
            logging.warn('TinybirdService requires workspaceId, adminToken, and siteUuid');
            return;
        }

        this.workspaceId = workspaceId;
        this.adminToken = adminToken;
        this.siteUuid = siteUuid;
        this._serverToken = this._generateServerToken();
    }

    getServerToken() {
        // Refresh server token it it's about to expire
        if (this._isJWTExpired(this._serverToken, 5 * 60)) {
            this._serverToken = this._generateServerToken();
        }
        return this._serverToken;
    }

    _generateServerToken() {
        return this._generateTinybirdJWT({name: 'ghost-server-token-' + this.siteUuid, expiresInMinutes: 60});
    }

    _generateTinybirdJWT({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 10} = {}) {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
        const payload = {
            workspace_id: this.workspaceId,
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

        return jwt.sign(payload, this.adminToken, {noTimestamp: true});
    }

    _isJWTExpired(token, bufferSeconds = 300) {
        try {
            const decoded = jwt.verify(token, this.adminToken);
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