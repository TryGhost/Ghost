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
            adminToken: 'test-admin-token',
            tracker: {
                endpoint: 'https://api.tinybird.co/v0/events'
            },
            stats: {
                endpoint: 'https://api.tinybird.co'
            }
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

    it('should throw an error if tinybirdConfig is not set', function () {
        tinybirdConfig = null;
        assert.throws(() => {
            tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
        }, /Invalid Tinybird configuration/);
    });

    it('should throw an error if remote config is missing required fields', function () {
        tinybirdConfig = {
            workspaceId: 'test-workspace-id'
            // missing adminToken, tracker.endpoint, and stats.endpoint
        };
        assert.throws(() => {
            tinybirdService = new TinybirdService({tinybirdConfig, siteUuid});
        }, /Invalid Tinybird configuration/);
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
    });

    describe('validateConfig', function () {
        it('should exist as a static method', function () {
            assert.ok(TinybirdService.validateConfig);
        });

        it('should validate a valid remote configuration', function () {
            const config = {
                workspaceId: 'test-workspace-id',
                adminToken: 'test-admin-token',
                tracker: {
                    endpoint: 'https://api.tinybird.co/v0/events'
                },
                stats: {
                    endpoint: 'https://api.tinybird.co'
                }
            };
            const result = TinybirdService.validateConfig(config);
            assert.equal(result.isValid, true);
            assert.equal(result.errors.length, 0);
        });

        it('should fail validation for missing config', function () {
            const result = TinybirdService.validateConfig(null);
            assert.equal(result.isValid, false);
            assert.ok(result.errors.includes('Tinybird configuration is missing'));
        });

        it('should fail validation for config missing workspaceId', function () {
            const config = {
                adminToken: 'test-admin-token',
                tracker: {
                    endpoint: 'https://api.tinybird.co/v0/events'
                },
                stats: {
                    endpoint: 'https://api.tinybird.co'
                }
            };
            const result = TinybirdService.validateConfig(config);
            assert.equal(result.isValid, false);
            assert.ok(result.errors.includes('workspaceId is required'));
        });

        it('should fail validation for config missing adminToken', function () {
            const config = {
                workspaceId: 'test-workspace-id',
                tracker: {
                    endpoint: 'https://api.tinybird.co/v0/events'
                },
                stats: {
                    endpoint: 'https://api.tinybird.co'
                }
            };
            const result = TinybirdService.validateConfig(config);
            assert.equal(result.isValid, false);
            assert.ok(result.errors.includes('adminToken is required'));
        });

        it('should fail validation for config missing tracker endpoint', function () {
            const config = {
                workspaceId: 'test-workspace-id',
                adminToken: 'test-admin-token',
                stats: {
                    endpoint: 'https://api.tinybird.co'
                }
            };
            const result = TinybirdService.validateConfig(config);
            assert.equal(result.isValid, false);
            assert.ok(result.errors.includes('tracker.endpoint is required'));
        });

        it('should fail validation for config missing stats endpoint', function () {
            const config = {
                workspaceId: 'test-workspace-id',
                adminToken: 'test-admin-token',
                tracker: {
                    endpoint: 'https://api.tinybird.co/v0/events'
                }
            };
            const result = TinybirdService.validateConfig(config);
            assert.equal(result.isValid, false);
            assert.ok(result.errors.includes('stats.endpoint is required'));
        });

        it('should return multiple errors for multiple validation failures', function () {
            const config = {
                workspaceId: 'test-workspace-id'
                // missing adminToken, tracker.endpoint, and stats.endpoint
            };
            const result = TinybirdService.validateConfig(config);
            assert.equal(result.isValid, false);
            assert.equal(result.errors.length, 3);
            assert.ok(result.errors.includes('adminToken is required'));
            assert.ok(result.errors.includes('tracker.endpoint is required'));
            assert.ok(result.errors.includes('stats.endpoint is required'));
        });
    });

    describe('getTrackerEndpoint', function () {
        it('should return the tracker endpoint', function () {
            const endpoint = tinybirdService.getTrackerEndpoint();
            assert.equal(endpoint, 'https://api.tinybird.co/v0/events');
        });
    });

    describe('getStatsEndpoint', function () {
        it('should return the stats endpoint', function () {
            const endpoint = tinybirdService.getStatsEndpoint();
            assert.equal(endpoint, 'https://api.tinybird.co');
        });
    });
});