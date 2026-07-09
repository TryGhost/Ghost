import {describe, expect, it} from 'vitest';
import {isApiVersionCompatible, parseInstallRecords, pinManifest, removeInstallRecord, upsertInstallRecord} from '../../src/host/installs.ts';
import {derivePermissions} from '../../src/host/permissions.ts';
import {ADDON_API_VERSION, type AddonManifest} from '../../src/types.ts';

const manifest: AddonManifest = {
    name: 'SEO Assistant (demo)',
    handle: 'seo-assistant-demo',
    version: '0.1.0',
    api_version: '2026-01',
    publisher: 'Ghost Demo Co.',
    description: 'Crawls your posts for SEO problems.',
    backend: 'http://localhost:4650',
    sidebar: {label: 'SEO Assistant', icon: 'sparkles', route: '/'},
    targeting: [
        {target: 'admin.dashboard.card.render', bundle: './dashboard-card.js', integrity: 'sha256-abc'},
        {target: 'admin.page.render', bundle: './report-page.js'}
    ]
};

describe('isApiVersionCompatible', function () {
    it('accepts the current and earlier calendar versions', function () {
        expect(isApiVersionCompatible(ADDON_API_VERSION)).toBe(true);
        expect(isApiVersionCompatible('2025-06')).toBe(true);
    });

    it('rejects newer versions and junk', function () {
        expect(isApiVersionCompatible('2099-01')).toBe(false);
        expect(isApiVersionCompatible(undefined as unknown as string)).toBe(false);
    });
});

describe('pinManifest', function () {
    it('resolves bundle URLs against the manifest URL and keeps integrity', function () {
        const record = pinManifest(manifest, 'http://localhost:4650/manifest.json');

        expect(record.handle).toBe('seo-assistant-demo');
        expect(record.enabled).toBe(true);
        expect(record.version).toBe('0.1.0');
        expect(record.backend).toBe('http://localhost:4650');
        expect(record.targeting[0]).toEqual({
            target: 'admin.dashboard.card.render',
            bundleUrl: 'http://localhost:4650/dashboard-card.js',
            integrity: 'sha256-abc'
        });
        expect(record.targeting[1].integrity).toBeUndefined();
    });

    it('preserves the enabled flag when re-pinning an update', function () {
        const record = pinManifest(manifest, 'http://localhost:4650/manifest.json', false);
        expect(record.enabled).toBe(false);
    });

    it('pins publisher and description for detail screens', function () {
        const record = pinManifest(manifest, 'http://localhost:4650/manifest.json');
        expect(record.publisher).toBe('Ghost Demo Co.');
        expect(record.description).toBe('Crawls your posts for SEO problems.');
    });
});

describe('upsertInstallRecord / removeInstallRecord', function () {
    const record = pinManifest(manifest, 'http://localhost:4650/manifest.json');
    const other = pinManifest({...manifest, handle: 'other-addon', name: 'Other'}, 'http://localhost:9999/manifest.json');

    it('appends a new handle and replaces an existing one', function () {
        const appended = upsertInstallRecord([other], record);
        expect(appended.map(entry => entry.handle)).toEqual(['other-addon', 'seo-assistant-demo']);

        const replaced = upsertInstallRecord(appended, {...record, version: '0.2.0'});
        expect(replaced).toHaveLength(2);
        expect(replaced.find(entry => entry.handle === 'seo-assistant-demo')?.version).toBe('0.2.0');
    });

    it('removes by handle and leaves others untouched', function () {
        const remaining = removeInstallRecord([other, record], 'seo-assistant-demo');
        expect(remaining).toEqual([other]);
        expect(removeInstallRecord(remaining, 'missing')).toEqual([other]);
    });
});

describe('derivePermissions', function () {
    it('derives surfaces, sidebar, backend, and the blanket Admin API line', function () {
        const permissions = derivePermissions(manifest);
        expect(permissions.map(permission => permission.key)).toEqual([
            'dashboard-card', 'page', 'sidebar', 'admin-api', 'backend'
        ]);
        expect(permissions.find(permission => permission.key === 'backend')?.label).toContain('localhost:4650');
        expect(permissions.find(permission => permission.key === 'page')?.label).toContain('/apps/seo-assistant-demo');
    });

    it('always includes the Admin API line, even for a minimal manifest', function () {
        const permissions = derivePermissions({handle: 'minimal', targeting: []});
        expect(permissions.map(permission => permission.key)).toEqual(['admin-api']);
    });
});

describe('parseInstallRecords', function () {
    it('parses a valid JSON array', function () {
        const record = pinManifest(manifest, 'http://localhost:4650/manifest.json');
        expect(parseInstallRecords(JSON.stringify([record]))).toEqual([record]);
    });

    it('returns an empty list for null, junk, and non-arrays', function () {
        expect(parseInstallRecords(null)).toEqual([]);
        expect(parseInstallRecords('not json')).toEqual([]);
        expect(parseInstallRecords('{"a":1}')).toEqual([]);
    });
});
