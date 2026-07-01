const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

const {RemoteFlagsService} = require('../../../../../core/server/services/remote-flags/remote-flags-service');

const SITE_UUID = '550e8400-e29b-41d4-a716-446655440000';

function buildService(overrides = {}) {
    const request = overrides.request || sinon.stub();
    const applyOverrides = overrides.applyOverrides || sinon.stub();
    const service = new RemoteFlagsService({
        url: new URL('https://assets.example.com/platform/flags.json'),
        siteUuid: SITE_UUID,
        applyOverrides,
        request,
        pollInterval: 1000,
        jitter: 0,
        getRandom: () => 0,
        ...overrides
    });
    return {service, request, applyOverrides};
}

function ok(body, headers = {}) {
    return {statusCode: 200, body: JSON.stringify(body), headers};
}

describe('RemoteFlagsService', function () {
    let logInfo;
    let logWarn;

    beforeEach(function () {
        logInfo = sinon.stub(logging, 'info');
        logWarn = sinon.stub(logging, 'warn');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('refresh - happy path', function () {
        it('fetches, resolves and applies a manifest, and logs remote_flags.applied', async function () {
            const {service, request, applyOverrides} = buildService();
            request.resolves(ok({flagA: true, commentModeration: false}, {etag: '"v1"'}));

            await service.refresh();

            // @tryghost/request rejects a URL object, so the client must be called
            // with the string href, never the URL instance.
            assert.equal(typeof request.firstCall.args[0], 'string');
            assert.equal(request.firstCall.args[0], 'https://assets.example.com/platform/flags.json');

            assert.equal(applyOverrides.calledOnce, true);
            assert.deepEqual(applyOverrides.firstCall.args[0], {flagA: true, commentModeration: false});

            const appliedLog = logInfo.getCalls().find(c => c.args[0]?.system?.event === 'remote_flags.applied');
            assert.ok(appliedLog, 'expected a remote_flags.applied log');
            assert.deepEqual(appliedLog.args[0].system.flags, {flagA: true, commentModeration: false});
        });

        it('passes arbitrary flags through and resolves percentage ramps via the site UUID', async function () {
            const {service, applyOverrides} = buildService({
                request: sinon.stub().resolves(ok({
                    flagA: {value: true, percent: 100}, // full -> on
                    flagB: {value: true, percent: 0}, // 0% -> off
                    frontendOnlyFlag: true // arbitrary key -> passes through
                }))
            });

            await service.refresh();

            assert.deepEqual(applyOverrides.firstCall.args[0], {flagA: true, frontendOnlyFlag: true});
        });

        it('sends a conditional GET (If-None-Match) once an ETag is known', async function () {
            const {service, request} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves({statusCode: 304, body: '', headers: {}});

            await service.refresh();
            await service.refresh();

            const firstHeaders = request.firstCall.args[1].headers || {};
            const secondHeaders = request.secondCall.args[1].headers || {};
            assert.equal(firstHeaders['if-none-match'], undefined);
            assert.equal(secondHeaders['if-none-match'], '"v1"');
        });
    });

    describe('refresh - 304 not modified', function () {
        it('keeps last-known-good and does not re-log on 304', async function () {
            const {service, request, applyOverrides} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves({statusCode: 304, body: '', headers: {}});

            await service.refresh();
            const appliedCountAfterFirst = logInfo.getCalls().filter(c => c.args[0]?.system?.event === 'remote_flags.applied').length;
            applyOverrides.resetHistory();

            await service.refresh();

            assert.equal(applyOverrides.called, false, 'should not re-apply on 304');
            const appliedCountAfterSecond = logInfo.getCalls().filter(c => c.args[0]?.system?.event === 'remote_flags.applied').length;
            assert.equal(appliedCountAfterSecond, appliedCountAfterFirst, 'should not re-log applied on 304');
        });
    });

    describe('refresh - fail open', function () {
        it('applies an empty override map on 404 (no manifest)', async function () {
            const {service, applyOverrides} = buildService({
                request: sinon.stub().resolves({statusCode: 404, body: 'Not Found', headers: {}})
            });

            await service.refresh();

            assert.equal(applyOverrides.calledOnce, true);
            assert.deepEqual(applyOverrides.firstCall.args[0], {});
        });

        it('keeps last-known-good and warns on a network error', async function () {
            const {service, request, applyOverrides} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().rejects(new Error('ECONNRESET'));

            await service.refresh();
            applyOverrides.resetHistory();
            await service.refresh();

            assert.equal(applyOverrides.called, false, 'must not change overrides on network error');
            assert.ok(logWarn.getCalls().some(c => c.args[0]?.system?.event === 'remote_flags.fetch_failed'));
        });

        it('keeps last-known-good and warns on a 5xx status', async function () {
            const {service, request, applyOverrides} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves({statusCode: 503, body: 'oops', headers: {}});

            await service.refresh();
            applyOverrides.resetHistory();
            await service.refresh();

            assert.equal(applyOverrides.called, false);
            assert.ok(logWarn.called);
        });

        it('keeps last-known-good and warns when the body is not valid JSON', async function () {
            const {service, request, applyOverrides} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves({statusCode: 200, body: '<html>not json</html>', headers: {etag: '"v2"'}});

            await service.refresh();
            applyOverrides.resetHistory();
            await service.refresh();

            assert.equal(applyOverrides.called, false);
            assert.ok(logWarn.getCalls().some(c => c.args[0]?.system?.event === 'remote_flags.parse_failed'));
        });

        it('never throws even if applyOverrides throws', async function () {
            const {service} = buildService({
                request: sinon.stub().resolves(ok({flagA: true})),
                applyOverrides: sinon.stub().throws(new Error('boom'))
            });

            await assert.doesNotReject(service.refresh());
        });
    });

    describe('change detection', function () {
        it('applies every successful fetch but logs applied only when the resolved set changes', async function () {
            const {service, request, applyOverrides} = buildService();
            // Two 200s with the same content (different etag) -> resolved set unchanged.
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves(ok({flagA: true}, {etag: '"v2"'}));

            await service.refresh();
            await service.refresh();

            assert.equal(applyOverrides.callCount, 2, 'applies on each successful fetch');
            const appliedLogs = logInfo.getCalls().filter(c => c.args[0]?.system?.event === 'remote_flags.applied');
            assert.equal(appliedLogs.length, 1, 'logs applied only once when nothing changed');
        });
    });

    describe('review hardening - etag, ordering, re-entrancy', function () {
        it('does not re-log applied when the manifest only reorders its keys', async function () {
            const {service, request} = buildService();
            request.onFirstCall().resolves(ok({flagA: true, commentModeration: false}, {etag: '"v1"'}));
            request.onSecondCall().resolves(ok({commentModeration: false, flagA: true}, {etag: '"v2"'}));

            await service.refresh();
            await service.refresh();

            const appliedLogs = logInfo.getCalls().filter(c => c.args[0]?.system?.event === 'remote_flags.applied');
            assert.equal(appliedLogs.length, 1, 'reordered-but-identical manifest must not re-log');
        });

        it('clears the ETag after a 200 with no ETag header, so the next poll re-fetches', async function () {
            const {service, request} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {})); // no etag
            request.onSecondCall().resolves(ok({flagA: true}, {}));

            await service.refresh();
            await service.refresh();

            assert.equal((request.secondCall.args[1].headers || {})['if-none-match'], undefined);
            assert.equal(request.callCount, 2);
        });

        it('does not commit the ETag when applying fails, so the next poll retries instead of getting a 304', async function () {
            const request = sinon.stub();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves(ok({flagA: true}, {etag: '"v2"'}));
            const applyOverrides = sinon.stub();
            applyOverrides.onFirstCall().throws(new Error('boom'));
            const {service} = buildService({request, applyOverrides});

            await service.refresh(); // apply throws -> ETag must NOT be committed
            await service.refresh(); // must re-fetch (no If-None-Match) and apply

            assert.equal((request.secondCall.args[1].headers || {})['if-none-match'], undefined, 'must not send a stale ETag for an unapplied manifest');
            assert.equal(applyOverrides.callCount, 2);
            assert.ok(logWarn.getCalls().some(c => c.args[0]?.system?.event === 'remote_flags.apply_failed'));
        });

        it('treats a 3xx as an unexpected status and keeps last-known-good', async function () {
            const {service, request, applyOverrides} = buildService();
            request.onFirstCall().resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onSecondCall().resolves({statusCode: 301, body: '', headers: {location: '/elsewhere'}});

            await service.refresh();
            applyOverrides.resetHistory();
            await service.refresh();

            assert.equal(applyOverrides.called, false);
            assert.ok(logWarn.getCalls().some(c => c.args[0]?.system?.event === 'remote_flags.fetch_bad_status'));
        });

        it('logs applied on each real transition through 404 -> 200 -> 404 but not on a repeated 404', async function () {
            const {service, request} = buildService();
            request.onCall(0).resolves({statusCode: 404, body: '', headers: {}});
            request.onCall(1).resolves(ok({flagA: true}, {etag: '"v1"'}));
            request.onCall(2).resolves({statusCode: 404, body: '', headers: {}});
            request.onCall(3).resolves({statusCode: 404, body: '', headers: {}});

            await service.refresh(); // {} applied (first application)
            await service.refresh(); // {flagA:true}
            await service.refresh(); // {} again (real transition)
            await service.refresh(); // {} repeated (no change)

            const appliedLogs = logInfo.getCalls().filter(c => c.args[0]?.system?.event === 'remote_flags.applied');
            assert.equal(appliedLogs.length, 3);
        });

        it('coalesces overlapping refresh calls into a single fetch', async function () {
            let resolveReq;
            const request = sinon.stub().returns(new Promise((res) => {
                resolveReq = res;
            }));
            const {service} = buildService({request});

            const p1 = service.refresh();
            const p2 = service.refresh(); // must early-return while p1 is in flight
            resolveReq(ok({flagA: true}));
            await Promise.all([p1, p2]);

            assert.equal(request.callCount, 1);
        });
    });

    describe('start / stop scheduling', function () {
        it('refreshes immediately on start and reschedules, until stopped', async function () {
            const clock = sinon.useFakeTimers();
            try {
                const request = sinon.stub().resolves(ok({flagA: true}));
                const {service} = buildService({request});

                await service.start();
                assert.equal(request.callCount, 1, 'refreshes once immediately on start');

                await clock.tickAsync(1000); // pollInterval, jitter 0
                assert.equal(request.callCount, 2, 'reschedules and polls again');

                service.stop();
                await clock.tickAsync(5000);
                assert.equal(request.callCount, 2, 'no further polls after stop');
            } finally {
                clock.restore();
            }
        });

        it('is idempotent: calling start twice does not double-schedule', async function () {
            const clock = sinon.useFakeTimers();
            try {
                const request = sinon.stub().resolves(ok({flagA: true}));
                const {service} = buildService({request});

                await service.start();
                await service.start();
                assert.equal(request.callCount, 1, 'only one immediate refresh');

                await clock.tickAsync(1000);
                assert.equal(request.callCount, 2, 'only one scheduled poll, not two');

                service.stop();
            } finally {
                clock.restore();
            }
        });
    });
});
