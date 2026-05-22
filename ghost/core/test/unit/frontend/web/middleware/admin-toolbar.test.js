const assert = require('node:assert/strict');
const sinon = require('sinon');

const settingsCache = require('../../../../../core/shared/settings-cache');
const adminToolbar = require('../../../../../core/frontend/web/middleware/admin-toolbar');

describe('admin toolbar middleware', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'admin_session_secret') {
                return 'admin-session-secret';
            }

            return null;
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    function createResponse() {
        const headers = {};

        return {
            locals: {},
            getHeader(name) {
                return headers[name];
            },
            setHeader(name, value) {
                headers[name] = value;
            },
            redirect(status, url) {
                this.redirectStatus = status;
                this.redirectUrl = url;
            },
            get headers() {
                return headers;
            }
        };
    }

    it('sets a frontend marker cookie and removes admin=1 from the URL', function () {
        const req = {
            headers: {},
            originalUrl: '/welcome/?admin=1&ref=test',
            query: {
                admin: '1',
                ref: 'test'
            },
            url: '/welcome/?admin=1&ref=test'
        };
        const res = createResponse();
        const next = sinon.spy();

        adminToolbar(req, res, next);

        assert.equal(next.called, false);
        assert.equal(res.redirectStatus, 302);
        assert.equal(res.redirectUrl, '/welcome/?ref=test');
        assert.match(res.headers['Set-Cookie'][0], /^ghost-admin-toolbar=/);
        assert.match(res.headers['Set-Cookie'][0], /Max-Age=3600/);
        assert.match(res.headers['Set-Cookie'][0], /HttpOnly/);
        assert.match(res.headers['Set-Cookie'][0], /SameSite=Lax/);
        assert.equal(res.headers['Cache-Control'], 'no-store');
        assert.equal(res.locals.staffFrontendToolsCookieUpdated, true);
    });

    it('sets a frontend marker cookie but does not enable the toolbar when hidden by query param', function () {
        const req = {
            headers: {},
            originalUrl: '/welcome/?admin=1&admin_toolbar=0&ref=test',
            query: {
                admin: '1',
                admin_toolbar: '0',
                ref: 'test'
            },
            url: '/welcome/?admin=1&admin_toolbar=0&ref=test'
        };
        const res = createResponse();
        const next = sinon.spy();

        adminToolbar(req, res, next);

        assert.equal(next.calledOnce, true);
        assert.equal(res.redirectStatus, undefined);
        assert.equal(res.redirectUrl, undefined);
        assert.match(res.headers['Set-Cookie'][0], /^ghost-admin-toolbar=/);
        assert.match(res.headers['Set-Cookie'][0], /Max-Age=3600/);
        assert.equal(res.headers['Cache-Control'], 'no-store');
        assert.equal(res.locals.staffFrontendToolsCookieUpdated, true);
        assert.equal(res.locals.staffFrontendToolsEnabled, false);
    });

    it('clears the frontend marker cookie and removes admin=0 from the URL', function () {
        const req = {
            headers: {},
            originalUrl: '/welcome/?admin=0&ref=test',
            query: {
                admin: '0',
                ref: 'test'
            },
            url: '/welcome/?admin=0&ref=test'
        };
        const res = createResponse();
        const next = sinon.spy();

        adminToolbar(req, res, next);

        assert.equal(next.called, false);
        assert.equal(res.redirectStatus, 302);
        assert.equal(res.redirectUrl, '/welcome/?ref=test');
        assert.match(res.headers['Set-Cookie'][0], /^ghost-admin-toolbar=;/);
        assert.match(res.headers['Set-Cookie'][0], /Max-Age=0/);
        assert.match(res.headers['Set-Cookie'][0], /HttpOnly/);
        assert.equal(res.headers['Cache-Control'], 'no-store');
    });

    it('does not set a frontend marker cookie if no signing secret is configured', function () {
        settingsCache.get.withArgs('admin_session_secret').returns(null);
        settingsCache.get.withArgs('theme_session_secret').returns(null);

        const req = {
            headers: {},
            originalUrl: '/welcome/?admin=1',
            query: {
                admin: '1'
            },
            url: '/welcome/?admin=1'
        };
        const res = createResponse();

        adminToolbar(req, res, sinon.spy());

        assert.equal(res.headers['Set-Cookie'], undefined);
        assert.equal(res.redirectUrl, '/welcome/');
    });

    it('removes toolbar hide query param from clean admin redirects', function () {
        const req = {
            originalUrl: '/welcome/?admin=0&admin_toolbar=0&ref=test',
            url: '/welcome/?admin=0&admin_toolbar=0&ref=test'
        };

        assert.equal(adminToolbar._private.getCleanRedirectUrl(req), '/welcome/?ref=test');
    });

    it('marks the request when the frontend marker cookie is valid', function () {
        const token = adminToolbar._private.createToken();
        const req = {
            headers: {
                cookie: `ghost-admin-toolbar=${token}`
            },
            query: {}
        };
        const res = createResponse();
        const next = sinon.spy();

        adminToolbar(req, res, next);

        assert.equal(next.calledOnce, true);
        assert.equal(res.locals.staffFrontendToolsEnabled, true);
    });

    it('does not mark the request when the valid frontend marker cookie is loaded in an iframe', function () {
        const token = adminToolbar._private.createToken();
        const req = {
            headers: {
                cookie: `ghost-admin-toolbar=${token}`,
                'sec-fetch-dest': 'iframe'
            },
            query: {}
        };
        const res = createResponse();
        const next = sinon.spy();

        adminToolbar(req, res, next);

        assert.equal(next.calledOnce, true);
        assert.equal(res.locals.staffFrontendToolsEnabled, false);
    });

    it('does not mark the request when the frontend marker cookie is invalid', function () {
        const req = {
            headers: {
                cookie: 'ghost-admin-toolbar=invalid'
            },
            query: {}
        };
        const res = createResponse();
        const next = sinon.spy();

        adminToolbar(req, res, next);

        assert.equal(next.calledOnce, true);
        assert.equal(res.locals.staffFrontendToolsEnabled, false);
    });

    it('ignores malformed and unrelated cookies', function () {
        assert.equal(adminToolbar._private.getCookieValue({headers: {}}), null);
        assert.equal(adminToolbar._private.getCookieValue({
            headers: {
                cookie: 'bad-cookie; other=value'
            }
        }), null);
    });

    it('falls back to the raw cookie value when decoding fails', function () {
        assert.equal(adminToolbar._private.getCookieValue({
            headers: {
                cookie: 'other=value; ghost-admin-toolbar=%E0%A4%A'
            }
        }), '%E0%A4%A');
    });

    it('rejects expired frontend marker cookies', function () {
        const now = Date.now();
        const token = adminToolbar._private.createToken(now);

        assert.equal(adminToolbar._private.hasValidToken(token, now + 60 * 60 * 1000 + 1), false);
    });

    it('rejects missing frontend marker cookies', function () {
        assert.equal(adminToolbar._private.hasValidToken(null), false);
    });

    it('rejects frontend marker cookies when no signing secret is configured', function () {
        const token = adminToolbar._private.createToken();

        settingsCache.get.withArgs('admin_session_secret').returns(null);
        settingsCache.get.withArgs('theme_session_secret').returns(null);

        assert.equal(adminToolbar._private.hasValidToken(token), false);
    });

    it('rejects frontend marker cookies with mismatched signature lengths', function () {
        const token = adminToolbar._private.createToken();
        const parts = token.split(':');

        parts[2] = 'bad';

        assert.equal(adminToolbar._private.hasValidToken(parts.join(':')), false);
    });
});
