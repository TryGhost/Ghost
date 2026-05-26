import assert from 'node:assert/strict';
import {toNotificationInput} from '../../../../../core/server/services/security-advisories/handler';
import type {AdvisoryEvent} from '../../../../../core/server/services/security-advisories/schema';

function makeAdvisory(overrides: Partial<AdvisoryEvent> = {}): AdvisoryEvent {
    return {
        ghsa_id: 'GHSA-aaaa-bbbb-cccc',
        cve_id: 'CVE-2026-12345',
        summary: 'Critical issue in Ghost',
        severity: 'critical',
        html_url: 'https://github.com/TryGhost/Ghost/security/advisories/GHSA-aaaa-bbbb-cccc',
        state: 'published',
        published_at: '2026-05-26T10:00:00Z',
        updated_at: '2026-05-26T10:00:00Z',
        vulnerabilities: [{
            package: {ecosystem: 'npm', name: 'ghost'},
            vulnerable_version_range: '< 6.50.0',
            patched_versions: '6.50.0'
        }],
        ...overrides
    } as AdvisoryEvent;
}

const ctx = {ghostVersion: '6.49.5', siteUrl: 'https://example.com'};

describe('security advisories handler', function () {
    it('produces an alert notification for a published critical advisory affecting the install', function () {
        const input = toNotificationInput(makeAdvisory(), ctx);
        assert.ok(input);
        assert.equal(input!.type, 'alert');
        assert.equal(input!.dismissible, false);
        assert.equal(input!.custom, true);
        assert.equal(input!.id, 'ghsa-GHSA-aaaa-bbbb-cccc');
    });

    it('embeds the local site URL and the advisory URL into the message body', function () {
        const input = toNotificationInput(makeAdvisory(), ctx);
        assert.ok(input);
        assert.match(input!.message, /<strong>https:\/\/example\.com<\/strong>/);
        assert.match(input!.message, /<a href="https:\/\/github\.com\/TryGhost\/Ghost\/security\/advisories\/GHSA-aaaa-bbbb-cccc">/);
        assert.match(input!.message, /https:\/\/ghost\.org\/help\/auth-reset/);
        assert.match(input!.message, /docs\.ghost\.org\/update/);
    });

    it('skips advisories in non-published state', function () {
        const states = ['triage', 'draft', 'closed', 'withdrawn'] as const;
        for (const state of states) {
            assert.equal(toNotificationInput(makeAdvisory({state}), ctx), null, `state=${state} should skip`);
        }
    });

    it('skips advisories below high severity', function () {
        const severities = ['low', 'moderate'] as const;
        for (const severity of severities) {
            assert.equal(toNotificationInput(makeAdvisory({severity}), ctx), null, `severity=${severity} should skip`);
        }
    });

    it('produces notifications for both high and critical severity', function () {
        assert.ok(toNotificationInput(makeAdvisory({severity: 'high'}), ctx));
        assert.ok(toNotificationInput(makeAdvisory({severity: 'critical'}), ctx));
    });

    it('skips advisories that do not affect the running Ghost version', function () {
        const advisory = makeAdvisory({
            vulnerabilities: [{
                package: {ecosystem: 'npm', name: 'ghost'},
                vulnerable_version_range: '< 6.40.0',
                patched_versions: '6.40.0'
            }]
        });
        // Install is on 6.49.5 — outside the < 6.40.0 range
        assert.equal(toNotificationInput(advisory, ctx), null);
    });

    it('normalises GitHub-style && and , range syntax', function () {
        const advisory = makeAdvisory({
            vulnerabilities: [{
                package: {ecosystem: 'npm', name: 'ghost'},
                vulnerable_version_range: '>= 6.0.0 && <= 6.49.5',
                patched_versions: '6.50.0'
            }]
        });
        const input = toNotificationInput(advisory, ctx);
        assert.ok(input, 'install on 6.49.5 should match the upper-bound range');
    });

    it('skips advisories targeting a different npm package', function () {
        const advisory = makeAdvisory({
            vulnerabilities: [{
                package: {ecosystem: 'npm', name: 'not-ghost'},
                vulnerable_version_range: '< 999.0.0',
                patched_versions: '999.0.0'
            }]
        });
        assert.equal(toNotificationInput(advisory, ctx), null);
    });

    it('skips advisories with an unparseable range rather than firing falsely', function () {
        const advisory = makeAdvisory({
            vulnerabilities: [{
                package: {ecosystem: 'npm', name: 'ghost'},
                vulnerable_version_range: 'nonsense',
                patched_versions: null
            }]
        });
        assert.equal(toNotificationInput(advisory, ctx), null);
    });
});
