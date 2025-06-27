const assert = require('assert/strict');
const TinybirdService = require('../../../../../core/server/services/tinybird/TinybirdService');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');

describe('TinybirdService', function () {
    let tinybirdService;
    let tinybirdConfig;
    let siteUuid;
    let clock;

    beforeEach(function () {
        tinybirdConfig = {
            workspaceId: 'test-workspace-id',
            adminToken: 'test-admin-token'
        };
        siteUuid = 'test-site-uuid';
        clock = sinon.useFakeTimers(Date.now());
        tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
    });

    afterEach(function () {
        sinon.restore();
        clock.restore();
    });

    it('should be defined', function () {
        assert.ok(tinybirdService);
    });

    describe('_generateTinybirdJWT', function () {
        it('should exist', function () {
            assert.ok(tinybirdService._generateTinybirdJWT);
        });

        it('should return a string', async function () {
            const token = tinybirdService._generateTinybirdJWT();
            assert.ok(token);
            assert.equal(typeof token, 'string');
        });

        it('should return a valid JWT', async function () {
            const token = tinybirdService._generateTinybirdJWT();
            const decoded = jwt.verify(token, tinybirdConfig.adminToken);
            assert.ok(decoded);
        });

        it('should return a JWT with the correct name', async function () {
            const token = tinybirdService._generateTinybirdJWT({name: 'test-name'});
            const decoded = jwt.verify(token, tinybirdConfig.adminToken);
            assert.ok(decoded);
            assert.equal(decoded.name, 'test-name');
        });

        it('should return a JWT with the correct scopes', async function () {
            const token = tinybirdService._generateTinybirdJWT();
            const decoded = jwt.verify(token, tinybirdConfig.adminToken);
            assert.ok(decoded);
            decoded.scopes.forEach((scope) => {
                assert.ok(scope.type === 'PIPES:READ');
                assert.ok(scope.resource);
                assert.ok(scope.fixed_params);
                assert.ok(scope.fixed_params.site_uuid === siteUuid);
            });
        });
    });

    describe('_isJWTExpired', function () {
        it('should exist', function () {
            assert.ok(tinybirdService._isJWTExpired);
        });

        it('should return false for a valid JWT', async function () {
            const token = tinybirdService._generateTinybirdJWT();
            const isExpired = tinybirdService._isJWTExpired(token);
            assert.ok(!isExpired);
        });

        it('should return true for an invalid JWT', async function () {
            const isExpired = tinybirdService._isJWTExpired('invalid-jwt');
            assert.ok(isExpired);
        });

        it('should return true for a JWT that is about to expire', async function () {
            // Create token that expires in 1 minute
            const token = tinybirdService._generateTinybirdJWT({expiresInMinutes: 1});
            // Check if the token is expired with a buffer of 300 seconds = 5 minutes
            const isExpired = tinybirdService._isJWTExpired(token);
            assert.ok(isExpired);
        });

        it('should return false for a JWT that is not about to expire', async function () {
            // Create token that expires in 10 minutes
            const token = tinybirdService._generateTinybirdJWT({expiresInMinutes: 10});
            // Check if the token is expired with a buffer of 300 seconds = 5 minutes
            const isExpired = tinybirdService._isJWTExpired(token);
            assert.ok(!isExpired);
        });
    });

    describe('_generateServerToken', function () {
        it('should exist', function () {
            assert.ok(tinybirdService._generateServerToken);
        });

        it('should return a valid JWT', async function () {
            const token = tinybirdService._generateServerToken();
            const decoded = jwt.verify(token, tinybirdConfig.adminToken);
            assert.ok(decoded);
        });

        it('should return a JWT with the correct name', async function () {
            const token = tinybirdService._generateServerToken();
            const decoded = jwt.verify(token, tinybirdConfig.adminToken);
            assert.ok(decoded);
            assert.equal(decoded.name, 'ghost-server-token-' + siteUuid);
        });

        it('should return a JWT with the correct scopes', async function () {
            const token = tinybirdService._generateServerToken();
            const decoded = jwt.verify(token, tinybirdConfig.adminToken);
            assert.ok(decoded);
            decoded.scopes.forEach((scope) => {
                assert.ok(scope.type === 'PIPES:READ');
                assert.ok(scope.resource);
                assert.ok(scope.fixed_params);
                assert.ok(scope.fixed_params.site_uuid === siteUuid);
            });
        });

        it('should return a JWT that is not expired', async function () {
            const token = tinybirdService._generateServerToken();
            const isExpired = tinybirdService._isJWTExpired(token);
            assert.ok(!isExpired);
        });
    });

    describe('getServerToken', function () {
        it('should exist', function () {
            assert.ok(tinybirdService.getServerToken);
        });
        
        it('should return the existing server JWT token if it is not expired', async function () {
            const token = tinybirdService.getServerToken();
            const newToken = tinybirdService.getServerToken();
            assert.equal(token, newToken);
        });

        it('should return a new server token if the existing one is about to expire', function () {
            const token = tinybirdService._serverToken;
            clock.tick(56 * 60 * 1000); // 56 minutes - past the 5 minute buffer for a 60 minute token
            const newToken = tinybirdService.getServerToken();
            assert.notEqual(token, newToken);
        });

        it('should return a new server token if the existing one is expired', function () {
            const token = tinybirdService._serverToken;
            clock.tick(60 * 60 * 1000); // 1 hour
            const newToken = tinybirdService.getServerToken();
            assert.notEqual(token, newToken);
        });

        it('should return the local token if jwt is not enabled and local is enabled', function () {
            tinybirdConfig.workspaceId = null;
            tinybirdConfig.adminToken = null;
            tinybirdConfig.stats = {
                local: {
                    enabled: true,
                    token: 'local-token'
                }
            };
            tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
            const token = tinybirdService.getServerToken();
            assert.equal(token, 'local-token');
        });

        it('should return the stats token if jwt is not enabled and local is not enabled', function () {
            tinybirdConfig.workspaceId = null;
            tinybirdConfig.adminToken = null;
            tinybirdConfig.stats = {
                token: 'stats-token'
            };
            tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
            const token = tinybirdService.getServerToken();
            assert.equal(token, 'stats-token');
        });
    });
});