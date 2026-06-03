const assert = require('node:assert/strict');

const {resolve, bucketFor} = require('../../../../../core/server/services/remote-flags/resolve');

// A fixed, dependency-free set of "known" flags for these pure tests.
const KNOWN = ['flagA', 'flagB', 'flagC', 'commentModeration'];

describe('remote-flags resolve', function () {
    describe('input guarding', function () {
        it('returns an empty map for a missing manifest', function () {
            assert.deepEqual(resolve(undefined, {siteId: 1, knownFlags: KNOWN}), {});
            assert.deepEqual(resolve(null, {siteId: 1, knownFlags: KNOWN}), {});
        });

        it('returns an empty map for a non-object manifest', function () {
            assert.deepEqual(resolve('flagA', {siteId: 1, knownFlags: KNOWN}), {});
            assert.deepEqual(resolve(42, {siteId: 1, knownFlags: KNOWN}), {});
            assert.deepEqual(resolve(['flagA'], {siteId: 1, knownFlags: KNOWN}), {});
        });

        it('returns an empty map when there are no known flags', function () {
            assert.deepEqual(resolve({flagA: true}, {siteId: 1, knownFlags: []}), {});
            assert.deepEqual(resolve({flagA: true}, {siteId: 1}), {});
        });

        it('never throws when options is null or omitted', function () {
            assert.deepEqual(resolve({flagA: true}, null), {});
            assert.deepEqual(resolve({flagA: true}), {});
        });

        it('never throws when knownFlags is not an array', function () {
            assert.deepEqual(resolve({flagA: true}, {siteId: 1, knownFlags: {}}), {});
            assert.deepEqual(resolve({flagA: true}, {siteId: 1, knownFlags: 'flagA'}), {});
        });

        it('does not mutate the input manifest', function () {
            const manifest = {flagA: true, flagB: {value: true, percent: 100}};
            const snapshot = JSON.parse(JSON.stringify(manifest));
            resolve(manifest, {siteId: 1, knownFlags: KNOWN});
            assert.deepEqual(manifest, snapshot);
        });
    });

    describe('bare boolean entries (full override)', function () {
        it('applies a bare true to every site', function () {
            assert.deepEqual(resolve({flagA: true}, {siteId: 1, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve({flagA: true}, {siteId: 99999, knownFlags: KNOWN}), {flagA: true});
        });

        it('applies a bare false to every site (kill switch)', function () {
            assert.deepEqual(resolve({commentModeration: false}, {siteId: 7, knownFlags: KNOWN}), {commentModeration: false});
        });
    });

    describe('per-entry skip (validation)', function () {
        it('skips flags that are not in the known set', function () {
            assert.deepEqual(resolve({unknownFlag: true, flagA: true}, {siteId: 1, knownFlags: KNOWN}), {flagA: true});
        });

        it('skips the special members key (not a labs flag)', function () {
            assert.deepEqual(resolve({members: true}, {siteId: 1, knownFlags: KNOWN}), {});
        });

        it('skips malformed entries but keeps valid siblings', function () {
            const manifest = {
                flagA: 'yes', // string -> skip
                flagB: 123, // number -> skip
                flagC: null, // null -> skip
                commentModeration: true // valid -> keep
            };
            assert.deepEqual(resolve(manifest, {siteId: 1, knownFlags: KNOWN}), {commentModeration: true});
        });

        it('skips object entries without a boolean value', function () {
            const manifest = {
                flagA: {percent: 50}, // no value -> skip
                flagB: {value: 'yes', percent: 50}, // non-bool value -> skip
                flagC: {} // empty -> skip
            };
            assert.deepEqual(resolve(manifest, {siteId: 1, knownFlags: KNOWN}), {});
        });

        it('skips object entries with a non-numeric percent', function () {
            const manifest = {
                flagA: {value: true, percent: '50'}, // string percent -> skip
                flagB: {value: true, percent: NaN} // NaN percent -> skip
            };
            assert.deepEqual(resolve(manifest, {siteId: 1, knownFlags: KNOWN}), {});
        });
    });

    describe('percentage ramps', function () {
        it('treats an object value with no percent as a full override', function () {
            assert.deepEqual(resolve({flagA: {value: true}}, {siteId: 1, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve({flagA: {value: false}}, {siteId: 1, knownFlags: KNOWN}), {flagA: false});
        });

        it('applies percent: 100 to every site', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: 100}}, {siteId: 123, knownFlags: KNOWN}), {flagA: true});
        });

        it('applies percent: 0 to no site', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: 0}}, {siteId: 123, knownFlags: KNOWN}), {});
        });

        it('clamps a negative percent to 0 (no opinion)', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: -10}}, {siteId: 123, knownFlags: KNOWN}), {});
        });

        it('clamps a percent above 100 to 100 (all sites)', function () {
            assert.deepEqual(resolve({flagA: {value: true, percent: 150}}, {siteId: 123, knownFlags: KNOWN}), {flagA: true});
        });

        it('produces a stable, deterministic 0-99 bucket for a (flag, siteId) pair', function () {
            const b1 = bucketFor('flagA', 42);
            const b2 = bucketFor('flagA', 42);
            assert.equal(b1, b2);
            assert.ok(b1 >= 0 && b1 < 100, `bucket ${b1} out of range`);
        });

        it('pins the bucket mapping to a golden value (guards cross-deploy ramp stability)', function () {
            // If this fails, the hash changed and every in-flight ramp re-buckets:
            // sites mid-ramp could flip off. Only update with a deliberate decision.
            assert.equal(bucketFor('flagA', 42), 53);
            assert.equal(bucketFor('commentModeration', 1), 40);
        });

        it('honors a fractional percent at the bucket boundary', function () {
            const siteId = 99;
            const bucket = bucketFor('flagA', siteId);
            assert.deepEqual(resolve({flagA: {value: true, percent: bucket + 0.5}}, {siteId, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve({flagA: {value: true, percent: bucket - 0.5}}, {siteId, knownFlags: KNOWN}), {});
        });

        it('skips entries whose percent is non-finite (Infinity/NaN are not valid numbers)', function () {
            // The Zod schema rejects non-finite percents, so the entry is skipped
            // (no opinion) rather than applied. These cannot occur in valid JSON.
            assert.deepEqual(resolve({flagA: {value: true, percent: Infinity}}, {siteId: 5, knownFlags: KNOWN}), {});
            assert.deepEqual(resolve({flagA: {value: true, percent: -Infinity}}, {siteId: 5, knownFlags: KNOWN}), {});
            assert.deepEqual(resolve({flagA: {value: true, percent: NaN}}, {siteId: 5, knownFlags: KNOWN}), {});
        });

        it('omits (does not set false) when a value:false ramp does not apply to this site', function () {
            // "no opinion" must mean the key is absent, not present-and-false.
            assert.deepEqual(resolve({flagA: {value: false, percent: 0}}, {siteId: 5, knownFlags: KNOWN}), {});
            const siteId = 5;
            const bucket = bucketFor('flagA', siteId);
            // out-of-bucket value:false -> omitted
            assert.deepEqual(resolve({flagA: {value: false, percent: bucket}}, {siteId, knownFlags: KNOWN}), {});
        });

        it('decorrelates buckets across flags for the same site', function () {
            // Different flag names should not all map to the same bucket for one site.
            const buckets = KNOWN.map(flag => bucketFor(flag, 42));
            const unique = new Set(buckets);
            assert.ok(unique.size > 1, `expected varied buckets, got ${JSON.stringify(buckets)}`);
        });

        it('includes a site iff its bucket is below the percent threshold', function () {
            const siteId = 314;
            const bucket = bucketFor('flagA', siteId);

            // Just above the bucket -> included.
            const included = resolve({flagA: {value: true, percent: bucket + 1}}, {siteId, knownFlags: KNOWN});
            assert.deepEqual(included, {flagA: true});

            // At/below the bucket -> excluded.
            const excluded = resolve({flagA: {value: true, percent: bucket}}, {siteId, knownFlags: KNOWN});
            assert.deepEqual(excluded, {});
        });

        it('is monotonic: a site enabled at a lower percent stays enabled at a higher percent', function () {
            const siteId = 2718;
            const bucket = bucketFor('flagB', siteId);
            // Pick a percent that includes this site, then a strictly higher one.
            const low = bucket + 1;
            const high = Math.min(100, bucket + 5);
            assert.deepEqual(resolve({flagB: {value: true, percent: low}}, {siteId, knownFlags: KNOWN}), {flagB: true});
            assert.deepEqual(resolve({flagB: {value: true, percent: high}}, {siteId, knownFlags: KNOWN}), {flagB: true});
        });

        it('supports ramped kill switches (value: false at a percent)', function () {
            const siteId = 555;
            const bucket = bucketFor('commentModeration', siteId);
            const result = resolve({commentModeration: {value: false, percent: bucket + 1}}, {siteId, knownFlags: KNOWN});
            assert.deepEqual(result, {commentModeration: false});
        });
    });

    describe('missing or non-scalar siteId', function () {
        it('still applies full overrides but skips ramps when siteId is absent', function () {
            const manifest = {
                flagA: true, // full -> applies
                flagB: {value: true, percent: 100}, // full -> applies
                flagC: {value: true, percent: 50} // ramp -> cannot bucket -> skip
            };
            assert.deepEqual(resolve(manifest, {knownFlags: KNOWN}), {flagA: true, flagB: true});
        });

        it('treats siteId 0 as a valid id but empty-string as no id', function () {
            // 0 is a finite number -> bucketable; '' -> not bucketable (ramp skipped).
            const withZero = resolve({flagA: {value: true, percent: 100}}, {siteId: 0, knownFlags: KNOWN});
            assert.deepEqual(withZero, {flagA: true});
            const zeroBucket = bucketFor('flagA', 0);
            assert.deepEqual(resolve({flagA: {value: true, percent: zeroBucket + 1}}, {siteId: 0, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve({flagA: {value: true, percent: 50}}, {siteId: '', knownFlags: KNOWN}), {});
        });

        it('never throws on a hostile non-scalar siteId, just skips ramps', function () {
            const manifest = {flagA: true, flagB: {value: true, percent: 50}};
            // Symbol, object, NaN, Infinity, boolean: full override still applies, ramp skipped.
            assert.deepEqual(resolve(manifest, {siteId: Symbol('x'), knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteId: {}, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteId: NaN, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteId: Infinity, knownFlags: KNOWN}), {flagA: true});
            assert.deepEqual(resolve(manifest, {siteId: true, knownFlags: KNOWN}), {flagA: true});
        });
    });

    describe('security: dangerous manifest keys', function () {
        it('ignores __proto__/constructor keys from a parsed manifest and never pollutes Object.prototype', function () {
            // A real manifest is JSON.parsed from the CDN; JSON.parse creates a real
            // own "__proto__" key (unlike an object literal). The knownFlags allowlist
            // must drop these and nothing may leak onto the global prototype.
            const manifest = JSON.parse('{"__proto__": {"value": true}, "constructor": true, "polluted": true, "flagA": true}');
            const result = resolve(manifest, {siteId: 1, knownFlags: KNOWN});
            assert.deepEqual(result, {flagA: true});
            assert.equal({}.polluted, undefined);
            assert.equal({}.value, undefined);
            assert.equal(Object.prototype.polluted, undefined);
        });
    });

    describe('mixed manifest', function () {
        it('resolves a realistic mix of entries', function () {
            const siteId = 4242;
            const ramped = bucketFor('flagC', siteId);
            const manifest = {
                commentModeration: false, // kill GA flag everywhere
                flagA: {value: true, percent: 100}, // enable everywhere
                flagB: {value: true, percent: 0}, // enable nowhere
                flagC: {value: true, percent: ramped + 1}, // enable for this site
                unknownFlag: true // skip
            };
            assert.deepEqual(resolve(manifest, {siteId, knownFlags: KNOWN}), {
                commentModeration: false,
                flagA: true,
                flagC: true
            });
        });
    });
});
