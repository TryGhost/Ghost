import {describe, it} from 'node:test';
import assert from 'node:assert';
import {diffPackages, duplicateInstances, identityOf, render} from '../compare-image-report.js';

const report = packages => ({
    profile: 'image',
    total: Object.values(packages).reduce(
        (acc, stats) => ({files: acc.files + stats.files, bytes: acc.bytes + stats.bytes}),
        {files: 0, bytes: 0}
    ),
    packages
});

const MIB = 1024 * 1024;

describe('identityOf', () => {
    it('keeps a plain name@version intact', () => {
        assert.strictEqual(identityOf('viem@2.55.11'), 'viem@2.55.11');
    });

    it('strips the peer suffix', () => {
        assert.strictEqual(identityOf('viem@2.55.11_zod@3.25.76'), 'viem@2.55.11');
    });

    it('handles scoped packages, which pnpm writes with a +', () => {
        assert.strictEqual(identityOf('@x402+hono@2.12.0_hono@4.12.18'), '@x402+hono@2.12.0');
    });

    it('does not mistake an underscore in the package name for a peer suffix', () => {
        assert.strictEqual(identityOf('string_decoder@1.3.0'), 'string_decoder@1.3.0');
        assert.strictEqual(identityOf('lodash._basecopy@3.0.0'), 'lodash._basecopy@3.0.0');
    });

    it('stops at the first peer of a multi-peer suffix', () => {
        assert.strictEqual(
            identityOf('mppx@0.6.20_express@4.22.2_supports-color@10.2.2__hono@4.12.18'),
            'mppx@0.6.20'
        );
    });

    it('handles an injected workspace package, which has no version separator to speak of', () => {
        assert.strictEqual(
            identityOf('@tryghost+i18n@file++++build+packages+i18n'),
            '@tryghost+i18n@file++++build+packages+i18n'
        );
    });
});

describe('diffPackages', () => {
    const baseline = report({'viem@2.55.11': {files: 2894, bytes: 7 * MIB}});

    it('marks packages missing from the baseline as added', () => {
        const [entry] = diffPackages(
            report({
                'viem@2.55.11': {files: 2894, bytes: 7 * MIB},
                'zod@3.25.76': {files: 266, bytes: MIB}
            }),
            baseline
        );

        assert.deepStrictEqual(entry, {id: 'zod@3.25.76', bytes: MIB, files: 266, status: 'added'});
    });

    it('marks packages missing from the current report as removed', () => {
        const [entry] = diffPackages(report({}), baseline);

        assert.strictEqual(entry.status, 'removed');
        assert.strictEqual(entry.bytes, -7 * MIB);
        assert.strictEqual(entry.files, -2894);
    });

    it('omits packages whose size and file count are unchanged', () => {
        assert.deepStrictEqual(diffPackages(baseline, baseline), []);
    });

    it('sorts by absolute byte change, largest first', () => {
        const changed = diffPackages(
            report({
                'small@1.0.0': {files: 1, bytes: MIB},
                'large@1.0.0': {files: 1, bytes: 5 * MIB},
                'viem@2.55.11': {files: 2894, bytes: 7 * MIB}
            }),
            baseline
        );

        assert.deepStrictEqual(changed.map(entry => entry.id), ['large@1.0.0', 'small@1.0.0']);
    });
});

describe('duplicateInstances', () => {
    it('finds one version unpacked under two peer suffixes', () => {
        const duplicates = duplicateInstances(report({
            'viem@2.55.11_zod@3.25.76': {files: 2894, bytes: 7 * MIB},
            'viem@2.55.11_zod@4.4.3': {files: 2894, bytes: 7 * MIB},
            'zod@3.25.76': {files: 266, bytes: MIB}
        }));

        assert.strictEqual(duplicates.length, 1);
        assert.strictEqual(duplicates[0].identity, 'viem@2.55.11');
        // Only the copies past the first are recoverable.
        assert.strictEqual(duplicates[0].bytes, 7 * MIB);
    });

    it('does not treat genuinely different versions as duplicates', () => {
        assert.deepStrictEqual(duplicateInstances(report({
            'ox@0.14.20': {files: 437, bytes: 3 * MIB},
            'ox@0.14.33': {files: 437, bytes: 3 * MIB}
        })), []);
    });

    it('ignores the app bucket', () => {
        assert.deepStrictEqual(duplicateInstances(report({'(app)': {files: 10, bytes: MIB}})), []);
    });
});

describe('render', () => {
    const current = report({
        'viem@2.55.11_zod@3.25.76': {files: 2894, bytes: 7 * MIB},
        'viem@2.55.11_zod@4.4.3': {files: 2894, bytes: 7 * MIB}
    });

    it('reports totals and duplicates without a baseline', () => {
        const output = render(current, null, {baselineLabel: 'abc1234'});

        assert.match(output, /No baseline report for `abc1234`/);
        assert.match(output, /Duplicated packages \(1, 7\.0 MiB recoverable\)/);
    });

    it('reports a signed delta against a baseline', () => {
        const output = render(current, report({'viem@2.55.11_zod@4.4.3': {files: 2894, bytes: 7 * MIB}}));

        assert.match(output, /\| Size \| 14\.0 MiB \| 7\.0 MiB \| \*\*\+7\.0 MiB\*\* \|/);
        assert.match(output, /\| Files \| 5788 \| 2894 \| \*\*\+2894\*\* \|/);
        assert.match(output, /`viem@2\.55\.11_zod@3\.25\.76` \| \+7\.0 MiB \| \+2894 \| added \|/);
    });
});
