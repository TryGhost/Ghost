const assert = require('node:assert/strict');

const {resolve, bucketFor} = require('../../../../../core/server/services/remote-flags/resolve');

// Sample flag names for these pure tests; the resolver doesn't gate on them.
const SAMPLE_FLAGS = ['flagA', 'flagB', 'flagC', 'commentModeration'];

// Stand-in site UUIDs; any stable, non-empty string works as a bucket key.
const SITE_A = '550e8400-e29b-41d4-a716-446655440000';
const SITE_B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('remote-flags resolve', function () {
    describe('input guarding', function () {
        it('returns an empty map for a missing manifest', function () {
            assert.deepEqual(resolve(undefined, {siteUuid: SITE_A}), {});
            assert.deepEqual(resolve(null, {siteUuid: SITE_A}), {});
        });

        it('returns an empty map for a non-object manifest', function () {
            assert.deepEqual(resolve('flagA', {siteUuid: SITE_A}), {});
            assert.deepEqual(resolve(42, {siteUuid: SITE_A}), {});
            assert.deepEqual(resolve(['flagA'], {siteUuid: SITE_A}), {});
        });

        it('never throws when options is null or omitted', function () {
            assert.deepEqual(resolve({flagA: true}, null), {flagA: true});
            assert.deepEqual(resolve({flagA: true}), {flagA: true});
        });

        it('does not mutate the input manifest', function () {
            const manifest = {flagA: true, flagB: {value: true, percent: 100}};
            const snapshot = JSON.parse(JSON.stringify(manifest));
            resolve(manifest, {siteUuid: SITE_A});
            assert.deepEqual(manifest, snapshot);
        });
    });

    describe('arbitrary flags', function () {
        it('honors any flag key, including ones the backend does not define', function () {
            // The frontend can ship a flag the backend has never heard of; it must
            // still flow through so the two can release on different cadences.
            assert.deepEqual(resolve({frontendOnlyFlag: true, flagA: false}, {siteUuid: SITE_A}), {
                frontendOnlyFlag: true,
                flagA: false
            });
        });
    });

    describe('bare boolean entries (full override)', function () {
        it('applies a bare true to every site', function () {
            assert.deepEqual(resolve({flagA: true}, {siteUuid: SITE_A}), {flagA: true});
            assert.deepEqual(resolve({flagA: true}, {siteUuid: SITE_B}), {flagA: true});
        });

        it('applies a bare false to every site (kill switch)', function () {
            assert.deepEqual(resolve({commentModeration: false}, {siteUuid: SITE_A}), {commentModeration: false});
        });
    });

    describe('per-entry skip (validation)', function () {
        it('skips malformed entries but keeps valid siblings', function () {
            const manifest = {
                flagA: 'yes', // string -> skip
                flagB: 123, // number -> skip
                flagC: null, // null -> skip
                commentModeration: true // valid -> keep
            };
            assert.deepEqual(resolve(manifest, {siteUuid: SITE_A}), {commentModeration: true});
        });

        it('skips object entries without a boolean value', function () {
            const manifest = {
                flagA: {percent: 50}, // no value -> skip
                flagB: {value: 'yes', percent: 50}, // non-bool value -> skip
                flagC: {} // empty -> skip
            };
            assert.deepEqual(resolve(manifest, {siteUuid: SITE_A}), {});
        });

        it('skips object entries with a non-numeric percent', function () {
            const manifest = {
                flagA: {value: true, percent: '50'}, // string percent -> skip
                flagB: {value: true, percent: NaN} // NaN percent -> skip
            };
            assert.deepEqual(resolve(manifest, {siteUuid: SITE_A}), {});
        });
    });

    describe('percentage ramps', function () {
        it('treats an object value with no percent as a full override', function () {
            assert.deepEqual(resolve({flagA: {value: true}}, {siteUuid: SITE_A}), {flagA: true});
            assert.deepEqual(resolve({flagA: {value: false}}, {siteUuid: SITE_A}), {flagA: false});
        });

        it('applies percent: 100 to every site', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: 100}}, {siteUuid: SITE_A}), {flagA: true});
        });

        it('applies percent: 0 to no site', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: 0}}, {siteUuid: SITE_A}), {});
        });

        it('clamps a negative percent to 0 (no opinion)', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: -10}}, {siteUuid: SITE_A}), {});
        });

        it('clamps a percent above 100 to 100 (all sites)', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: 150}}, {siteUuid: SITE_A}), {flagA: true});
        });

        it('produces a stable, deterministic 0-99 bucket for a (flag, siteUuid) pair', function () {
            const b1 = bucketFor('flagA', SITE_A);
            const b2 = bucketFor('flagA', SITE_A);
            assert.equal(b1, b2);
            assert.ok(b1 >= 0 && b1 < 100, `bucket ${b1} out of range`);
        });

        it('pins the bucket mapping to a golden value (guards cross-deploy ramp stability)', function () {
            // If this fails, the hash changed and every in-flight ramp re-buckets:
            // sites mid-ramp could flip off. Only update with a deliberate decision.
            assert.equal(bucketFor('flagA', SITE_A), 19);
            assert.equal(bucketFor('commentModeration', SITE_A), 69);
        });

        it('honors a fractional percent at the bucket boundary', function () {
            const siteUuid = SITE_A;
            const bucket = bucketFor('flagA', siteUuid);
            assert.deepEqual(resolve({flagA: {value: true, percent: bucket + 0.5}}, {siteUuid}), {flagA: true});
            assert.deepEqual(resolve({flagA: {value: true, percent: bucket - 0.5}}, {siteUuid}), {});
        });

        it('skips entries whose percent is non-finite (Infinity/NaN are not valid numbers)', function () {
            // The Zod schema rejects non-finite percents, so the entry is skipped
            // (no opinion) rather than applied. These cannot occur in valid JSON.
            assert.deepEqual(resolve({flagA: {value: true, percent: Infinity}}, {siteUuid: SITE_A}), {});
            assert.deepEqual(resolve({flagA: {value: true, percent: -Infinity}}, {siteUuid: SITE_A}), {});
            assert.deepEqual(resolve({flagA: {value: true, percent: NaN}}, {siteUuid: SITE_A}), {});
        });

        it('omits (does not set false) when a value:false ramp does not apply to this site', function () {
            // "no opinion" must mean the key is absent, not present-and-false.
            assert.deepEqual(resolve({flagA: {value: false, percent: 0}}, {siteUuid: SITE_A}), {});
            const siteUuid = SITE_A;
            const bucket = bucketFor('flagA', siteUuid);
            // out-of-bucket value:false -> omitted
            assert.deepEqual(resolve({flagA: {value: false, percent: bucket}}, {siteUuid}), {});
        });

        it('decorrelates buckets across flags for the same site', function () {
            // Different flag names should not all map to the same bucket for one site.
            const buckets = SAMPLE_FLAGS.map(flag => bucketFor(flag, SITE_A));
            const unique = new Set(buckets);
            assert.ok(unique.size > 1, `expected varied buckets, got ${JSON.stringify(buckets)}`);
        });

        it('includes a site iff its bucket is below the percent threshold', function () {
            const siteUuid = SITE_A;
            const bucket = bucketFor('flagA', siteUuid);

            // Just above the bucket -> included.
            const included = resolve({flagA: {value: true, percent: bucket + 1}}, {siteUuid});
            assert.deepEqual(included, {flagA: true});

            // At/below the bucket -> excluded.
            const excluded = resolve({flagA: {value: true, percent: bucket}}, {siteUuid});
            assert.deepEqual(excluded, {});
        });

        it('is monotonic: a site enabled at a lower percent stays enabled at a higher percent', function () {
            const siteUuid = SITE_A;
            const bucket = bucketFor('flagB', siteUuid);
            // Pick a percent that includes this site, then a strictly higher one.
            const low = bucket + 1;
            const high = Math.min(100, bucket + 5);
            assert.deepEqual(resolve({flagB: {value: true, percent: low}}, {siteUuid}), {flagB: true});
            assert.deepEqual(resolve({flagB: {value: true, percent: high}}, {siteUuid}), {flagB: true});
        });

        it('supports ramped kill switches (value: false at a percent)', function () {
            const siteUuid = SITE_A;
            const bucket = bucketFor('commentModeration', siteUuid);
            const result = resolve({commentModeration: {value: false, percent: bucket + 1}}, {siteUuid});
            assert.deepEqual(result, {commentModeration: false});
        });
    });

    describe('missing or non-string siteUuid', function () {
        it('still applies full overrides but skips ramps when siteUuid is absent', function () {
            const manifest = {
                flagA: true, // full -> applies
                flagB: {value: true, percent: 100}, // full -> applies
                flagC: {value: true, percent: 50} // ramp -> cannot bucket -> skip
            };
            assert.deepEqual(resolve(manifest, {}), {flagA: true, flagB: true});
        });

        it('buckets a present UUID but treats empty-string as no id', function () {
            // A non-empty UUID is bucketable; '' -> not bucketable (ramp skipped).
            const bucket = bucketFor('flagA', SITE_A);
            assert.deepEqual(resolve({flagA: {value: true, percent: bucket + 1}}, {siteUuid: SITE_A}), {flagA: true});
            assert.deepEqual(resolve({flagA: {value: true, percent: 50}}, {siteUuid: ''}), {});
        });

        it('never throws on a hostile non-string siteUuid, just skips ramps', function () {
            const manifest = {flagA: true, flagB: {value: true, percent: 50}};
            // Number, Symbol, object, NaN, Infinity, boolean: full override still applies, ramp skipped.
            assert.deepEqual(resolve(manifest, {siteUuid: 42}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteUuid: Symbol('x')}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteUuid: {}}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteUuid: NaN}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteUuid: Infinity}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteUuid: true}), {flagA: true});
        });
    });

    describe('security: dangerous manifest keys', function () {
        it('skips keys that collide with Object.prototype and never pollutes the prototype', function () {
            // JSON.parse creates a real own "__proto__" key (unlike an object literal);
            // the resolver must drop these unsafe keys and never touch Object.prototype.
            const manifest = JSON.parse('{"__proto__": {"value": true}, "constructor": true, "prototype": true, "polluted": true, "flagA": true}');
            const result = resolve(manifest, {siteUuid: SITE_A});
            assert.deepEqual(result, {polluted: true, flagA: true});
            assert.equal({}.polluted, undefined);
            assert.equal({}.value, undefined);
            assert.equal(Object.prototype.polluted, undefined);
        });

        it('skips built-in method names so they cannot shadow Object.prototype members', function () {
            // {toString: true} must not flow through: writing it onto labs would make
            // labs.toString a boolean and throw TypeError for any caller of it.
            const manifest = {toString: true, valueOf: true, hasOwnProperty: false, flagA: true};
            const result = resolve(manifest, {siteUuid: SITE_A});
            assert.deepEqual(result, {flagA: true});
            // The resolved object's built-ins are intact.
            assert.equal(typeof result.toString, 'function');
            assert.equal(typeof result.hasOwnProperty, 'function');
        });
    });

    describe('mixed manifest', function () {
        it('resolves a realistic mix of entries', function () {
            const siteUuid = SITE_A;
            const ramped = bucketFor('flagC', siteUuid);
            const manifest = {
                commentModeration: false, // kill GA flag everywhere
                flagA: {value: true, percent: 100}, // enable everywhere
                flagB: {value: true, percent: 0}, // enable nowhere
                flagC: {value: true, percent: ramped + 1}, // enable for this site
                frontendOnlyFlag: true // arbitrary key -> passes through
            };
            assert.deepEqual(resolve(manifest, {siteUuid}), {
                commentModeration: false,
                flagA: true,
                flagC: true,
                frontendOnlyFlag: true
            });
        });
    });
});
