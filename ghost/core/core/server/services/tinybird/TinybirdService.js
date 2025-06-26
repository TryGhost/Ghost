const jwt = require('jsonwebtoken');
const {IncorrectUsageError} = require('@tryghost/errors');

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
            throw new IncorrectUsageError({
                message: 'TinybirdService requires workspaceId, adminToken, and siteUuid'
            });
        }

        this.workspaceId = workspaceId;
        this.adminToken = adminToken;
        this.siteUuid = siteUuid;
    }

    async getTinybirdJWT(name = `tinybird-jwt-${this.siteUuid}`) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

        const payload = {
            workspace_id: this.workspaceId,
            name,
            exp: Math.floor(expiresAt.getTime() / 1000),
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
}

module.exports = TinybirdService;