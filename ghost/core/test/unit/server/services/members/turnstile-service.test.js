const assert = require('assert/strict');
const sinon = require('sinon');
const TurnstileService = require('../../../../../core/server/services/members/turnstile-service');
const externalRequest = require('../../../../../core/server/lib/request-external');
const logging = require('@tryghost/logging');

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

describe('TurnstileService', function () {
    beforeEach(function () {
        sinon.stub(externalRequest, 'post');
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    function makeService(overrides = {}) {
        return new TurnstileService({
            enabled: true,
            secretKey: 'test-secret',
            siteverifyUrl: SITEVERIFY_URL,
            ...overrides
        });
    }

    function runMiddleware(middleware, req) {
        return new Promise((resolve) => {
            middleware(req, null, resolve);
        });
    }

    it('Creates a middleware', function () {
        const middleware = makeService().getMiddleware();
        assert.equal(middleware.length, 3);
    });

    it('No-ops when not enabled', async function () {
        const middleware = makeService({enabled: false}).getMiddleware();

        // req is null: an inactive middleware must not touch the request
        const err = await runMiddleware(middleware, null);

        assert.equal(err, undefined);
        assert.equal(externalRequest.post.called, false);
    });

    it('No-ops when enabled but no secret key is set', async function () {
        const middleware = makeService({secretKey: null}).getMiddleware();

        const err = await runMiddleware(middleware, null);

        assert.equal(err, undefined);
        assert.equal(externalRequest.post.called, false);
    });

    it('Returns a 400 if no token provided', async function () {
        const middleware = makeService().getMiddleware();

        const err = await runMiddleware(middleware, {body: {}});

        assert.equal(err.statusCode, 400);
        assert.equal(err.message, 'Turnstile token missing');
        assert.equal(externalRequest.post.called, false);
    });

    it('Calls next with no error when verification succeeds', async function () {
        externalRequest.post.resolves({body: {success: true}});

        const middleware = makeService().getMiddleware();

        const err = await runMiddleware(middleware, {
            body: {turnstileToken: 'test-token'},
            ip: '1.2.3.4'
        });

        assert.equal(err, undefined);
        assert.equal(externalRequest.post.calledOnce, true);
        const [url, options] = externalRequest.post.firstCall.args;
        assert.equal(url, SITEVERIFY_URL);
        assert.deepEqual(options.form, {
            secret: 'test-secret',
            response: 'test-token',
            remoteip: '1.2.3.4'
        });
    });

    it('Returns a sparse 400 when verification fails, logging codes server-side', async function () {
        externalRequest.post.resolves({body: {success: false, 'error-codes': ['invalid-input-response']}});

        const middleware = makeService().getMiddleware();

        const err = await runMiddleware(middleware, {body: {turnstileToken: 'bad-token'}, ip: '1.2.3.4'});

        assert.equal(err.statusCode, 400);
        assert.equal(err.message, 'Turnstile verification failed');
        // error codes are logged but never sent to the client
        assert.equal(logging.error.calledOnce, true);
        assert.match(logging.error.firstCall.args[0], /invalid-input-response/);
    });

    it('Fails gracefully when siteverify is unreachable', async function () {
        externalRequest.post.rejects(new Error('ECONNREFUSED'));

        const middleware = makeService().getMiddleware();

        const err = await runMiddleware(middleware, {body: {turnstileToken: 'test-token'}, ip: '1.2.3.4'});

        assert.equal(err.statusCode, 500);
        assert.equal(err.message, 'Failed to verify Turnstile token');
    });

    it('Evaluates enabled and secretKey per request so settings apply without a restart', async function () {
        let enabled = false;
        let secretKey = 'first-secret';

        const middleware = makeService({
            enabled: () => enabled,
            secretKey: () => secretKey
        }).getMiddleware();

        // Disabled: passes through without verification
        const errWhileDisabled = await runMiddleware(middleware, null);
        assert.equal(errWhileDisabled, undefined);
        assert.equal(externalRequest.post.called, false);

        // Flag flipped on at runtime: verification now runs with the current key
        enabled = true;
        secretKey = 'second-secret';
        externalRequest.post.resolves({body: {success: true}});

        const errWhileEnabled = await runMiddleware(middleware, {body: {turnstileToken: 'test-token'}, ip: '1.2.3.4'});
        assert.equal(errWhileEnabled, undefined);
        assert.equal(externalRequest.post.firstCall.args[1].form.secret, 'second-secret');
    });
});
