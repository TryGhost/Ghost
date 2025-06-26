const assert = require('assert/strict');
const TinybirdService = require('../../../../../core/server/services/tinybird');

describe('TinybirdService', function () {
    let tinybirdService;
    let workspaceId;
    let adminToken;
    let siteUuid;

    beforeEach(function () {
        workspaceId = 'test-workspace-id';
        adminToken = 'test-admin-token';
        siteUuid = 'test-site-uuid';
        tinybirdService = new TinybirdService({workspaceId, adminToken, siteUuid});
    });

    it('should be defined', function () {
        assert.ok(tinybirdService);
    });

    describe('getTinybirdJWT', function () {
        it('should exist', function () {
            assert.ok(tinybirdService.getTinybirdJWT);
        });

        it('should return a string', async function () {
            const jwt = await tinybirdService.getTinybirdJWT();
            assert.ok(jwt);
            assert.equal(typeof jwt, 'string');
        });
    });
});