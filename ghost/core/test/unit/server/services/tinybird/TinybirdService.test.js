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

    it('should not throw an error if tinybirdConfig is not set', function () {
        tinybirdConfig = null;
        tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
        assert.ok(tinybirdService);
    });

    describe('_generateToken', function () {
        it('should exist', function () {
            assert.ok(tinybirdService._generateToken);
        });

        it('should return an object with token and exp properties', async function () {
            const result = tinybirdService._generateToken();
            assert.ok(result);
            assert.equal(typeof result, 'object');
            assert.ok(result.token);
            assert.equal(typeof result.token, 'string');
            assert.ok(result.exp);
            assert.equal(typeof result.exp, 'number');
        });

        it('should return a valid JWT', async function () {
            const result = tinybirdService._generateToken();
            const decoded = jwt.verify(result.token, tinybirdConfig.adminToken);
            assert.ok(decoded);
        });

        it('should return a JWT with the correct name', async function () {
            const result = tinybirdService._generateToken({name: 'test-name'});
            const decoded = jwt.verify(result.token, tinybirdConfig.adminToken);
            assert.ok(decoded);
            assert.equal(decoded.name, 'test-name');
        });

        it('should return a JWT with the correct scopes', async function () {
            const result = tinybirdService._generateToken();
            const decoded = jwt.verify(result.token, tinybirdConfig.adminToken);
            assert.ok(decoded);
            decoded.scopes.forEach((scope) => {
                assert.ok(scope.type === 'PIPES:READ');
                assert.ok(scope.resource);
                assert.ok(scope.fixed_params);
                assert.ok(scope.fixed_params.site_uuid === siteUuid);
            });
        });

        it('should return exp that matches the JWT payload exp', async function () {
            const result = tinybirdService._generateToken();
            const decoded = jwt.verify(result.token, tinybirdConfig.adminToken);
            assert.ok(typeof decoded === 'object' && decoded.exp);
            assert.equal(result.exp, decoded.exp);
        });
    });

    describe('_isJWTExpired', function () {
        it('should exist', function () {
            assert.ok(tinybirdService._isJWTExpired);
        });

        it('should return false for a valid JWT', async function () {
            const result = tinybirdService._generateToken();
            const isExpired = tinybirdService._isJWTExpired(result.token);
            assert.ok(!isExpired);
        });

        it('should return true for an invalid JWT', async function () {
            const isExpired = tinybirdService._isJWTExpired('invalid-jwt');
            assert.ok(isExpired);
        });

        it('should return true for a JWT that is about to expire', async function () {
            // Create token that expires in 1 minute
            const result = tinybirdService._generateToken({expiresInMinutes: 1});
            // Check if the token is expired with a buffer of 300 seconds = 5 minutes
            const isExpired = tinybirdService._isJWTExpired(result.token);
            assert.ok(isExpired);
        });

        it('should return false for a JWT that is not about to expire', async function () {
            // Create token that expires in 10 minutes
            const result = tinybirdService._generateToken({expiresInMinutes: 10});
            // Check if the token is expired with a buffer of 300 seconds = 5 minutes
            const isExpired = tinybirdService._isJWTExpired(result.token);
            assert.ok(!isExpired);
        });
    });

    describe('getToken', function () {
        it('should exist', function () {
            assert.ok(tinybirdService.getToken);
        });
        
        it('should return the existing server JWT token if it is not expired', async function () {
            const tokenResult = tinybirdService.getToken();
            const newTokenResult = tinybirdService.getToken();
            assert.deepEqual(tokenResult, newTokenResult);
            assert.ok(tokenResult.token);
            assert.ok(typeof tokenResult.exp === 'number');
        });

        it('should return a new server token if the existing one is about to expire', function () {
            const initialResult = tinybirdService.getToken();
            const initialToken = initialResult.token;
            clock.tick(176 * 60 * 1000); // 176 minutes - past the 5 minute buffer for a 3 hour token
            const newResult = tinybirdService.getToken();
            assert.notEqual(initialToken, newResult.token);
            assert.ok(typeof newResult.exp === 'number');
        });

        it('should return a new server token if the existing one is expired', function () {
            const initialResult = tinybirdService.getToken();
            const initialToken = initialResult.token;
            clock.tick(180 * 60 * 1000); // 3 hours
            const newResult = tinybirdService.getToken();
            assert.notEqual(initialToken, newResult.token);
            assert.ok(typeof newResult.exp === 'number');
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
            const result = tinybirdService.getToken();
            assert.equal(result.token, 'local-token');
            assert.equal(result.exp, undefined);
        });

        it('should return the stats token if jwt is not enabled and local is not enabled', function () {
            tinybirdConfig.workspaceId = null;
            tinybirdConfig.adminToken = null;
            tinybirdConfig.stats = {
                token: 'stats-token'
            };
            tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
            const result = tinybirdService.getToken();
            assert.equal(result.token, 'stats-token');
            assert.equal(result.exp, undefined);
        });
    });
});