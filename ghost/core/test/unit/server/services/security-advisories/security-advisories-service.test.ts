import assert from 'node:assert/strict';
import sinon from 'sinon';
import {SecurityAdvisoriesService} from '../../../../../core/server/services/security-advisories/security-advisories-service';

function makeFetchImpl(body: unknown, status = 200): typeof fetch {
    return (async () => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: 'OK',
        json: async () => body
    })) as unknown as typeof fetch;
}

const ENDPOINT = 'https://api.example.test/security-advisories';

describe('SecurityAdvisoriesService', function () {
    let notificationsAdd: sinon.SinonStub;

    beforeEach(function () {
        notificationsAdd = sinon.stub().resolves();
    });

    it('adds a notification for each actionable advisory in the feed', async function () {
        const fetchImpl = makeFetchImpl([
            {
                ghsa_id: 'GHSA-1',
                cve_id: null,
                summary: 'first',
                severity: 'critical',
                html_url: 'https://github.com/TryGhost/Ghost/security/advisories/GHSA-1',
                state: 'published',
                published_at: '2026-05-26T10:00:00Z',
                updated_at: '2026-05-26T10:00:00Z',
                vulnerabilities: [{
                    package: {ecosystem: 'npm', name: 'ghost'},
                    vulnerable_version_range: '< 6.50.0',
                    patched_versions: '6.50.0'
                }]
            },
            // skipped — moderate severity
            {
                ghsa_id: 'GHSA-2',
                cve_id: null,
                summary: 'second',
                severity: 'moderate',
                html_url: 'https://github.com/x/y',
                state: 'published',
                published_at: null,
                updated_at: '2026-05-26T10:00:00Z',
                vulnerabilities: [{
                    package: {ecosystem: 'npm', name: 'ghost'},
                    vulnerable_version_range: '< 999.0.0',
                    patched_versions: null
                }]
            }
        ]);

        const service = new SecurityAdvisoriesService({
            notifications: {add: notificationsAdd},
            ghostVersion: '6.49.5',
            siteUrl: 'https://example.com',
            endpoint: ENDPOINT,
            fetchImpl
        });

        await service.check();

        sinon.assert.calledOnce(notificationsAdd);
        const body = notificationsAdd.firstCall.args[0];
        assert.equal(body.notifications.length, 1);
        assert.equal(body.notifications[0].id, 'ghsa-GHSA-1');
        assert.equal(body.notifications[0].type, 'alert');
    });

    it('logs and returns cleanly when the feed fetch fails', async function () {
        const failingFetch = (async () => {
            throw new Error('network down');
        }) as unknown as typeof fetch;

        const service = new SecurityAdvisoriesService({
            notifications: {add: notificationsAdd},
            ghostVersion: '6.49.5',
            siteUrl: 'https://example.com',
            endpoint: ENDPOINT,
            fetchImpl: failingFetch
        });

        await service.check();

        sinon.assert.notCalled(notificationsAdd);
    });

    it('treats a non-OK HTTP response as a failed fetch', async function () {
        const fetchImpl = makeFetchImpl(null, 503);

        const service = new SecurityAdvisoriesService({
            notifications: {add: notificationsAdd},
            ghostVersion: '6.49.5',
            siteUrl: 'https://example.com',
            endpoint: ENDPOINT,
            fetchImpl
        });

        await service.check();

        sinon.assert.notCalled(notificationsAdd);
    });
});
