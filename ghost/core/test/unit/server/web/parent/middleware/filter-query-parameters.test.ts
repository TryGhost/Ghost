import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import type {NextFunction, Request, Response} from 'express';
import sinon from 'sinon';

import filterQueryParameters from '../../../../../../core/server/web/parent/middleware/filter-query-parameters';

describe('Middleware: filterQueryParameters', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('filterRequestTarget', function () {
        it('keeps globally allowed parameters and strips undeclared parameters', function () {
            const result = filterQueryParameters.filterRequestTarget('/r/example?step=run-step-id&m=member-id&unknown=value');

            assert.equal(result.requestTarget, '/r/example?m=member-id&step=run-step-id');
            assert.deepEqual(result.removedUnknownParameters, ['unknown']);
        });

        it('preserves allowed attribution parameters', function () {
            const result = filterQueryParameters.filterRequestTarget('/welcome/?utm_source=newsletter&ref=weekly&m=member-id');

            assert.equal(result.requestTarget, '/welcome/?m=member-id&ref=weekly&utm_source=newsletter');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('does not filter Admin API query parameters', function () {
            const result = filterQueryParameters.filterRequestTarget('/ghost/api/admin/posts/?utm_source=newsletter&unknown=value');

            assert.equal(result.requestTarget, '/ghost/api/admin/posts/?utm_source=newsletter&unknown=value');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('allows arbitrary parameters on exempt paths', function () {
            const result = filterQueryParameters.filterRequestTarget('/.ghost/activitypub/inbox?utm_source=newsletter&unknown=value');

            assert.equal(result.requestTarget, '/.ghost/activitypub/inbox?utm_source=newsletter&unknown=value');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('allows arbitrary parameters when force_params=true', function () {
            const result = filterQueryParameters.filterRequestTarget('/welcome/?unknown=value&force_params=true');

            assert.equal(result.requestTarget, '/welcome/?unknown=value&force_params=true');
            assert.deepEqual(result.removedUnknownParameters, []);
        });

        it('applies the Content API allowlist', function () {
            const result = filterQueryParameters.filterRequestTarget('/ghost/api/content/posts/?key=content-key&include=authors&unknown=value&m=member-id');

            assert.equal(result.requestTarget, '/ghost/api/content/posts/?include=authors&key=content-key');
            assert.deepEqual(result.removedUnknownParameters, ['m', 'unknown']);
        });

        it('does not allow force_params to bypass Content API filtering', function () {
            const result = filterQueryParameters.filterRequestTarget('/ghost/api/canary/content/posts/?key=content-key&force_params=true&unknown=value');

            assert.equal(result.requestTarget, '/ghost/api/canary/content/posts/?key=content-key');
            assert.deepEqual(result.removedUnknownParameters, ['force_params', 'unknown']);
        });

        it('preserves repeated allowed parameters', function () {
            const result = filterQueryParameters.filterRequestTarget('/members/?ids=one&ids=two&unknown=value');

            assert.equal(result.requestTarget, '/members/?ids=one&ids=two');
            assert.deepEqual(result.removedUnknownParameters, ['unknown']);
        });

        it('preserves admin toolbar, gift link, and automation parameters', function () {
            const result = filterQueryParameters.filterRequestTarget('/post/?admin=true&admin_toolbar=0&gift=unlock-token&step=run-step-id');

            assert.equal(result.requestTarget, '/post/?admin=true&admin_toolbar=0&gift=unlock-token&step=run-step-id');
            assert.deepEqual(result.removedUnknownParameters, []);
        });
    });

    it('updates the Express request and logs stripped undeclared parameters', function () {
        const req = {
            originalUrl: '/r/example?step=run-step-id&m=member-id&unknown=value',
            url: '/r/example?step=run-step-id&m=member-id&unknown=value',
            path: '/r/example',
            query: {
                step: 'run-step-id',
                m: 'member-id',
                unknown: 'value'
            }
        };
        const res = {};
        const next = sinon.spy();
        const warn = sinon.stub(logging, 'warn');

        filterQueryParameters(req as unknown as Request, res as unknown as Response, next as NextFunction);

        assert.equal(req.originalUrl, '/r/example?m=member-id&step=run-step-id');
        assert.equal(req.url, '/r/example?m=member-id&step=run-step-id');
        assert.deepEqual({...req.query}, {m: 'member-id', step: 'run-step-id'});
        assert.equal(Object.getPrototypeOf(req.query), Object.prototype);
        sinon.assert.calledOnceWithExactly(warn, '[query-parameter-filter] Stripped undeclared query parameter(s) from /r/example: unknown');
        sinon.assert.calledOnce(next);
    });

    it('does not warn when all parameters are allowed', function () {
        const req = {
            originalUrl: '/welcome/?utm_source=newsletter',
            url: '/welcome/?utm_source=newsletter',
            path: '/welcome/',
            query: {
                utm_source: 'newsletter'
            }
        };
        const res = {};
        const next = sinon.spy();
        const warn = sinon.stub(logging, 'warn');

        filterQueryParameters(req as unknown as Request, res as unknown as Response, next as NextFunction);

        assert.equal(req.originalUrl, '/welcome/?utm_source=newsletter');
        assert.deepEqual({...req.query}, {utm_source: 'newsletter'});
        sinon.assert.notCalled(warn);
        sinon.assert.calledOnce(next);
    });

    it('preserves the existing query object for exempt paths', function () {
        const query = {
            include: 'roles'
        };
        const req = {
            originalUrl: '/ghost/api/admin/session/?include=roles',
            url: '/ghost/api/admin/session/?include=roles',
            path: '/ghost/api/admin/session/',
            query
        };
        const res = {};
        const next = sinon.spy();

        filterQueryParameters(req as unknown as Request, res as unknown as Response, next as NextFunction);

        assert.equal(req.query, query);
        assert.equal(typeof req.query.hasOwnProperty, 'function');
        sinon.assert.calledOnce(next);
    });
});
