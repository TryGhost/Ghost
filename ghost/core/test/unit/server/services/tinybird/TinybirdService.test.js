const assert = require('assert/strict');
const TinybirdService = require('../../../../../core/server/services/tinybird/TinybirdService');
const jwt = require('jsonwebtoken');

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
            const token = await tinybirdService.getTinybirdJWT();
            assert.ok(token);
            assert.equal(typeof token, 'string');
        });

        it('should return a valid JWT', async function () {
            const token = await tinybirdService.getTinybirdJWT();
            const decoded = jwt.verify(token, adminToken);
            assert.ok(decoded);
        });

        it('should return a JWT with the correct name', async function () {
            const token = await tinybirdService.getTinybirdJWT({name: 'test-name'});
            const decoded = jwt.verify(token, adminToken);
            assert.ok(decoded);
            assert.equal(decoded.name, 'test-name');
        });

        it('should return a JWT with the correct scopes', async function () {
            const token = await tinybirdService.getTinybirdJWT();
            const decoded = jwt.verify(token, adminToken);
            assert.ok(decoded);
            decoded.scopes.forEach((scope) => {
                assert.ok(scope.type === 'PIPES:READ');
                assert.ok(scope.resource);
                assert.ok(scope.fixed_params);
                assert.ok(scope.fixed_params.site_uuid === siteUuid);
            });
        });
    });

    describe('isJWTExpired', function () {
        it('should exist', function () {
            assert.ok(tinybirdService.isJWTExpired);
        });

        it('should return false for a valid JWT', async function () {
            const token = await tinybirdService.getTinybirdJWT();
            const isExpired = await tinybirdService.isJWTExpired(token);
            assert.ok(!isExpired);
        });

        it('should return true for an invalid JWT', async function () {
            const isExpired = await tinybirdService.isJWTExpired('invalid-jwt');
            assert.ok(isExpired);
        });

        it('should return true for a JWT that is about to expire', async function () {
            // Create token that expires in 1 minute
            const token = await tinybirdService.getTinybirdJWT({expiresInMinutes: 1});
            // Check if the token is expired with a buffer of 300 seconds = 5 minutes
            const isExpired = await tinybirdService.isJWTExpired(token);
            assert.ok(isExpired);
        });

        it('should return false for a JWT that is not about to expire', async function () {
            // Create token that expires in 10 minutes
            const token = await tinybirdService.getTinybirdJWT({expiresInMinutes: 10});
            // Check if the token is expired with a buffer of 300 seconds = 5 minutes
            const isExpired = await tinybirdService.isJWTExpired(token);
            assert.ok(!isExpired);
        });
    });

    describe('checkOrRefreshTinybirdJWT', function () {
        it('should exist', function () {
            assert.ok(tinybirdService.checkOrRefreshTinybirdJWT);
        });

        it('should return a new token if the old token is expired', async function () {
            const token = await tinybirdService.getTinybirdJWT({expiresInMinutes: 1});
            const newToken = await tinybirdService.checkOrRefreshTinybirdJWT(token);
            assert.ok(newToken);
            assert.notEqual(newToken, token);
        });

        it('should return the same token if the old token is not expired', async function () {
            const token = await tinybirdService.getTinybirdJWT({expiresInMinutes: 10});
            const newToken = await tinybirdService.checkOrRefreshTinybirdJWT(token);
            assert.ok(newToken);
            assert.equal(newToken, token);
        });
    });
});