const jwt = require('jsonwebtoken');
const errors = require('@tryghost/errors');

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
            throw new errors.IncorrectUsageError({
                message: 'TinybirdService requires workspaceId, adminToken, and siteUuid'
            });
        }

        this.workspaceId = workspaceId;
        this.adminToken = adminToken;
        this.siteUuid = siteUuid;
    }

    async getTinybirdJWT({name = `tinybird-jwt-${this.siteUuid}`, expiresInMinutes = 10} = {}) {
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

    async isJWTExpired(token, bufferSeconds = 300) {
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

    async checkOrRefreshTinybirdJWT(token) {
        const isExpired = await this.isJWTExpired(token);
        if (isExpired) {
            const newToken = await this.getTinybirdJWT();
            return newToken;
        }
        return token;
    }
}

module.exports = TinybirdService;