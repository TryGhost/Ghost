const assert = require('assert');

const legacyApiPathMatch = require('../../../../../core/server/services/api-version-compatibility/legacy-api-path-match');

describe('Legacy Path Match', function () {
    it('returns null, admin for all supported permutations', function () {
        const permutations = [
            '/ghost/api/admin/',
            '/admin/',
            '/ghost/api/admin',
            '/admin',
            '/ghost/api/admin/session/',
            '/admin/session/',
            '/ghost/api/admin/session',
            '/admin/session',
            '/ghost/api/admin/session/something/',
            '/admin/session/something/',
            '/ghost/api/admin/session/something',
            '/admin/session/something'
        ];

        permutations.forEach((url) => {
            assert.deepEqual(legacyApiPathMatch(url), {version: null, api: 'admin'}, url);
        });
    });

    it('returns canary, admin for all supported permutations', function () {
        const permutations = [
            '/ghost/api/canary/admin/',
            '/canary/admin/',
            '/ghost/api/canary/admin',
            '/canary/admin',
            '/ghost/api/canary/admin/session/',
            '/canary/admin/session/',
            '/ghost/api/canary/admin/session',
            '/canary/admin/session',
            '/ghost/api/canary/admin/session/something/',
            '/canary/admin/session/something/',
            '/ghost/api/canary/admin/session/something',
            '/canary/admin/session/something'
        ];

        permutations.forEach((url) => {
            assert.deepEqual(legacyApiPathMatch(url), {version: 'canary', api: 'admin'}, url);
        });
    });

    it('returns v4, admin for all permutations', function () {
        const permutations = [
            '/ghost/api/v4/admin/',
            '/v4/admin/',
            '/ghost/api/v4/admin',
            '/v4/admin',
            '/ghost/api/v4/admin/session/',
            '/v4/admin/session/',
            '/ghost/api/v4/admin/session',
            '/v4/admin/session',
            '/ghost/api/v4/admin/session/something/',
            '/v4/admin/session/something/',
            '/ghost/api/v4/admin/session/something',
            '/v4/admin/session/something'
        ];

        permutations.forEach((url) => {
            assert.deepEqual(legacyApiPathMatch(url), {version: 'v4', api: 'admin'}, url);
        });
    });
});
