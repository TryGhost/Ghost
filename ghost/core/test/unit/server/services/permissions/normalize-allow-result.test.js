const assert = require('node:assert/strict');
const {normalizeAllow, normalizeDeny, resultsMatch} = require('../../../../../core/server/services/permissions/normalize-allow-result');

class NoPermissionError extends Error {}
class HostingLimitError extends Error {}

describe('Permissions: normalize-allow-result', function () {
    describe('normalizeAllow', function () {
        const cases = [
            ['undefined', undefined, []],
            ['null', null, []],
            ['empty object', {}, []],
            ['{excludedAttrs: undefined}', {excludedAttrs: undefined}, []],
            ['{excludedAttrs: null}', {excludedAttrs: null}, []],
            ['{excludedAttrs: []}', {excludedAttrs: []}, []],
            ['{excludedAttrs: ["tags"]}', {excludedAttrs: ['tags']}, ['tags']],
            ['dedupes', {excludedAttrs: ['tags', 'tags']}, ['tags']],
            ['sorts', {excludedAttrs: ['z', 'a']}, ['a', 'z']],
            ['case-sensitive', {excludedAttrs: ['Tags', 'tags']}, ['Tags', 'tags']]
        ];
        for (const [name, input, expected] of cases) {
            it(`treats ${name} as allow with excludedAttrs=${JSON.stringify(expected)}`, function () {
                const result = normalizeAllow(input);
                assert.equal(result.result, 'allow');
                assert.deepEqual(result.excludedAttrs, expected);
            });
        }
    });

    describe('normalizeDeny', function () {
        it('classifies as deny and preserves error subclass name', function () {
            const r = normalizeDeny(new NoPermissionError('nope'));
            assert.equal(r.result, 'deny');
            assert.equal(r.errorType, 'NoPermissionError');
        });

        it('falls back to "Error" when constructor missing', function () {
            const r = normalizeDeny(null);
            assert.equal(r.result, 'deny');
            assert.equal(r.errorType, 'Error');
        });
    });

    describe('resultsMatch', function () {
        it('two allows with same excludedAttrs match', function () {
            assert.ok(resultsMatch(
                normalizeAllow({excludedAttrs: ['tags']}),
                normalizeAllow({excludedAttrs: ['tags']})
            ));
        });
        it('allow vs allow with different excludedAttrs do not match', function () {
            assert.ok(!resultsMatch(
                normalizeAllow({excludedAttrs: ['tags']}),
                normalizeAllow({excludedAttrs: []})
            ));
        });
        it('allow vs deny do not match', function () {
            assert.ok(!resultsMatch(
                normalizeAllow(undefined),
                normalizeDeny(new NoPermissionError())
            ));
        });
        it('two denies match regardless of error subclass (HostingLimit vs NoPermission)', function () {
            assert.ok(resultsMatch(
                normalizeDeny(new HostingLimitError('over limit')),
                normalizeDeny(new NoPermissionError('nope'))
            ));
        });
        it('undefined vs {excludedAttrs: []} are equivalent', function () {
            assert.ok(resultsMatch(
                normalizeAllow(undefined),
                normalizeAllow({excludedAttrs: []})
            ));
        });
    });
});
