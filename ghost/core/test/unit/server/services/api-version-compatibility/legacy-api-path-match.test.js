const assert = require('assert/strict');

const legacyApiPathMatch = require('../../../../../core/server/services/api-version-compatibility/legacy-api-path-match');

describe('Legacy Path Match', function () {
    it('returns null, admin for all supported permutations', function () {
        const permutations = [
            '/subdir/ghost/api/admin/',
            '/ghost/api/admin/',
            '/admin/',
            '/subdir/ghost/api/admin',
            '/ghost/api/admin',
            '/admin',
            '/subdir/ghost/api/admin/session/',
            '/ghost/api/admin/session/',
            '/admin/session/',
            '/subdir/ghost/api/admin/session',
            '/ghost/api/admin/session',
            '/admin/session',
            '/subdir/ghost/api/admin/session/something/',
            '/ghost/api/admin/session/something/',
            '/admin/session/something/',
            '/subdir/ghost/api/admin/session/something',
            '/ghost/api/admin/session/something',
            '/admin/session/something'
        ];

        permutations.forEach((url) => {
            assert.deepEqual(legacyApiPathMatch(url), {version: null, api: 'admin'}, url);
        });
    });

    it('returns canary, admin for all supported permutations', function () {
        const permutations = [
            '/subdir/ghost/api/canary/admin/',
            '/ghost/api/canary/admin/',
            '/canary/admin/',
            '/subdir/ghost/api/canary/admin',
            '/ghost/api/canary/admin',
            '/canary/admin',
            '/subdir/ghost/api/canary/admin/session/',
            '/ghost/api/canary/admin/session/',
            '/canary/admin/session/',
            '/subdir/ghost/api/canary/admin/session',
            '/ghost/api/canary/admin/session',
            '/canary/admin/session',
            '/subdir/ghost/api/canary/admin/session/something/',
            '/ghost/api/canary/admin/session/something/',
            '/canary/admin/session/something/',
            '/subdir/ghost/api/canary/admin/session/something',
            '/ghost/api/canary/admin/session/something',
            '/canary/admin/session/something'
        ];

        permutations.forEach((url) => {
            assert.deepEqual(legacyApiPathMatch(url), {version: 'canary', api: 'admin'}, url);
        });
    });

    it('returns v4, admin for all permutations', function () {
        const permutations = [
            '/subdir/ghost/api/v4/admin/',
            '/ghost/api/v4/admin/',
            '/v4/admin/',
            '/subdir/ghost/api/v4/admin',
            '/ghost/api/v4/admin',
            '/v4/admin',
            '/subdir/ghost/api/v4/admin/session/',
            '/ghost/api/v4/admin/session/',
            '/v4/admin/session/',
            '/subdir/ghost/api/v4/admin/session',
            '/ghost/api/v4/admin/session',
            '/v4/admin/session',
            '/subdir/ghost/api/v4/admin/session/something/',
            '/ghost/api/v4/admin/session/something/',
            '/v4/admin/session/something/',
            '/subdir/ghost/api/v4/admin/session/something',
            '/ghost/api/v4/admin/session/something',
            '/v4/admin/session/something'
        ];

        permutations.forEach((url) => {
            assert.deepEqual(legacyApiPathMatch(url), {version: 'v4', api: 'admin'}, url);
        });
    });
});
