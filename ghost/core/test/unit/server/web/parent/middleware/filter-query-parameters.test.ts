import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import express from 'express';
import sinon from 'sinon';
import request from 'supertest';

import {filterQueryParameters, filterRequestTarget} from '../../../../../../core/server/web/parent/middleware/filter-query-parameters';

describe('Middleware: filterQueryParameters', function () {
    function createApp() {
        const app = express();

        app.use(filterQueryParameters);
        app.use((req, res) => {
            res.json({
                originalUrl: req.originalUrl,
                url: req.url,
                path: req.path,
                query: req.query,
                queryHasOwnProperty: typeof req.query.hasOwnProperty === 'function'
            });
        });

        return app;
    }

    afterEach(function () {
        sinon.restore();
    });

    describe('filterRequestTarget', function () {
        it('keeps globally allowed parameters and strips undeclared parameters', function () {
            const result = filterRequestTarget('/r/example?step=run-step-id&m=member-id&unknown=value');

            assert.equal(result.requestTarget, '/r/example?step=run-step-id&m=member-id');
            assert.deepEqual(result.removedUnknownParameters, ['unknown']);
        });

        it('preserves allowed attribution parameters', function () {
            const result = filterRequestTarget('/welcome/?utm_source=newsletter&ref=weekly&m=member-id');

            assert.equal(result.requestTarget, '/welcome/?utm_source=newsletter&ref=weekly&m=member-id');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('does not filter Admin API query parameters', function () {
            const result = filterRequestTarget('/ghost/api/admin/posts/?utm_source=newsletter&unknown=value');

            assert.equal(result.requestTarget, '/ghost/api/admin/posts/?utm_source=newsletter&unknown=value');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('allows arbitrary parameters on exempt paths', function () {
            const result = filterRequestTarget('/.ghost/activitypub/inbox?utm_source=newsletter&unknown=value');

            assert.equal(result.requestTarget, '/.ghost/activitypub/inbox?utm_source=newsletter&unknown=value');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('allows arbitrary parameters when force_params=true', function () {
            const result = filterRequestTarget('/welcome/?unknown=value&force_params=true');

            assert.equal(result.requestTarget, '/welcome/?unknown=value&force_params=true');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('applies the Content API allowlist', function () {
            const result = filterRequestTarget('/ghost/api/content/posts/?key=content-key&include=authors&unknown=value&m=member-id');

            assert.equal(result.requestTarget, '/ghost/api/content/posts/?key=content-key&include=authors');
            assert.deepEqual(result.removedUnknownParameters, ['m', 'unknown']);
        });

        it('does not allow force_params to bypass Content API filtering', function () {
            const result = filterRequestTarget('/ghost/api/canary/content/posts/?key=content-key&force_params=true&unknown=value');

            assert.equal(result.requestTarget, '/ghost/api/canary/content/posts/?key=content-key');
            assert.deepEqual(result.removedUnknownParameters, ['force_params', 'unknown']);
        });

        it('preserves repeated allowed parameters', function () {
            const result = filterRequestTarget('/members/?ids=one&ids=two&unknown=value');

            assert.equal(result.requestTarget, '/members/?ids=one&ids=two');
            assert.deepEqual(result.removedUnknownParameters, ['unknown']);
        });

        it('preserves admin toolbar, gift link, and automation parameters', function () {
            const result = filterRequestTarget('/post/?admin=true&admin_toolbar=0&gift=unlock-token&step=run-step-id');

            assert.equal(result.requestTarget, '/post/?admin=true&admin_toolbar=0&gift=unlock-token&step=run-step-id');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('preserves notification unsubscribe and tier preview parameters', function () {
            const result = filterRequestTarget('/unsubscribe/?comments=1&updatesandannouncements=1&member_tier=silver');

            assert.equal(result.requestTarget, '/unsubscribe/?comments=1&updatesandannouncements=1&member_tier=silver');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('preserves fields for the frontend comments API', function () {
            const result = filterRequestTarget('/members/api/comments/post/post-id/?fields=id%2Cpinned');

            assert.equal(result.requestTarget, '/members/api/comments/post/post-id/?fields=id%2Cpinned');
            assert.deepEqual(result.removedUnknownParameters, []);
        });
    });

    it('updates the Express request and logs stripped undeclared parameters', async function () {
        const warn = sinon.stub(logging, 'warn');

        await request(createApp())
            .get('/r/example?step=run-step-id&m=member-id&unknown=value')
            .expect(200)
            .expect({
                originalUrl: '/r/example?step=run-step-id&m=member-id',
                url: '/r/example?step=run-step-id&m=member-id',
                path: '/r/example',
                query: {
                    step: 'run-step-id',
                    m: 'member-id'
                },
                queryHasOwnProperty: true
            });

        sinon.assert.calledOnceWithExactly(warn, '[query-parameter-filter] Stripped undeclared query parameter(s) from /r/example: unknown');
    });

    it('does not warn when all parameters are allowed', async function () {
        const warn = sinon.stub(logging, 'warn');

        await request(createApp())
            .get('/welcome/?utm_source=newsletter')
            .expect(200)
            .expect({
                originalUrl: '/welcome/?utm_source=newsletter',
                url: '/welcome/?utm_source=newsletter',
                path: '/welcome/',
                query: {
                    utm_source: 'newsletter'
                },
                queryHasOwnProperty: true
            });

        sinon.assert.notCalled(warn);
    });

    it('preserves query parameters on exempt paths', async function () {
        await request(createApp())
            .get('/ghost/api/admin/session/?include=roles')
            .expect(200)
            .expect({
                originalUrl: '/ghost/api/admin/session/?include=roles',
                url: '/ghost/api/admin/session/?include=roles',
                path: '/ghost/api/admin/session/',
                query: {
                    include: 'roles'
                },
                queryHasOwnProperty: true
            });
    });
});
