const LinkRedirectsService = require('../../../../../core/server/services/link-redirection/link-redirects-service');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const crypto = require('crypto');

describe('LinkRedirectsService', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('getSlugUrl', function () {
        it('works for first random slug that does not exist', async function () {
            const instance = new LinkRedirectsService({
                linkRedirectRepository: {
                    getByURL: () => Promise.resolve(undefined)
                },
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            // stub crypto.randomBytes to return a known value toString
            sinon.stub(crypto, 'randomBytes').returns(Buffer.from('00000000', 'hex'));
            const url = await instance.getSlugUrl();
            assert.equal(url.href, 'https://localhost:2368/r/00000000');
        });

        it('works when first random slug already exists', async function () {
            const instance = new LinkRedirectsService({
                linkRedirectRepository: {
                    getByURL: (url) => {
                        if (url.href === 'https://localhost:2368/r/00000000') {
                            return Promise.resolve({});
                        }
                        return Promise.resolve(undefined);
                    }
                },
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            // stub crypto.randomBytes to return 00000000 first and something else
            sinon.stub(crypto, 'randomBytes')
                .onFirstCall().returns(Buffer.from('00000000', 'hex'))
                .onSecondCall().returns(Buffer.from('11111111', 'hex'));
            const url = await instance.getSlugUrl();
            assert.equal(url.href, 'https://localhost:2368/r/11111111');
        });
    });

    describe('addRedirect', function () {
        it('saves', async function () {
            const linkRedirectRepository = {
                save: sinon.fake()
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            await instance.addRedirect(new URL('https://localhost:2368/a'), new URL('https://localhost:2368/b'));
            sinon.assert.calledOnce(linkRedirectRepository.save);
            assert.equal(linkRedirectRepository.save.getCall(0).args[0].from.href, 'https://localhost:2368/a');
            assert.equal(linkRedirectRepository.save.getCall(0).args[0].to.href, 'https://localhost:2368/b');
        });
    });

    describe('relativeRedirectPrefix', function () {
        it('returns relative path without subdirectory for Express routing', function () {
            const instance = new LinkRedirectsService({
                linkRedirectRepository: {},
                config: {
                    baseURL: new URL('https://localhost:2368/blog/')
                }
            });
            assert.equal(instance.relativeRedirectPrefix(), '/r/');
        });

        it('returns same value as redirectPrefix when no subdirectory configured', function () {
            const instance = new LinkRedirectsService({
                linkRedirectRepository: {},
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            assert.equal(instance.relativeRedirectPrefix(), '/r/');
        });
    });

    describe('handleRequest', function () {
        it('redirects if found', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.href === 'https://localhost:2368/r/a') {
                        return Promise.resolve({
                            to: new URL('https://localhost:2368/b')
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/a'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            assert.equal(res.redirect.getCall(0).args[0], 'https://localhost:2368/b');
            sinon.assert.calledWith(res.setHeader, 'X-Robots-Tag', 'noindex, nofollow');
        });

        it('does not redirect if not found', async function () {
            const linkRedirectRepository = {
                getByURL: () => Promise.resolve(undefined)
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: 'r/a'
            };
            const res = {};
            const next = sinon.fake();
            await instance.handleRequest(req, res, next);
            sinon.assert.calledOnce(next);
        });

        it('does not redirect if url does not contain a redirect prefix on site with no subdir', async function () {
            const instance = new LinkRedirectsService({
                linkRedirectRepository: {
                    getByURL: () => Promise.resolve(undefined)
                },
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: 'no_r/prefix'
            };
            const res = {};
            const next = sinon.fake();

            await instance.handleRequest(req, res, next);

            sinon.assert.calledOnce(next);
        });

        it('does not redirect if url does not contain a redirect prefix on site with subdir', async function () {
            const instance = new LinkRedirectsService({
                linkRedirectRepository: {
                    getByURL: () => Promise.resolve(undefined)
                },
                config: {
                    baseURL: new URL('https://localhost:2368/blog')
                }
            });
            const req = {
                originalUrl: 'blog/no_r/prefix'
            };
            const res = {};
            const next = sinon.fake();

            await instance.handleRequest(req, res, next);

            sinon.assert.calledOnce(next);
        });

        it('substitutes %%{uuid}%% placeholder with member UUID from query param', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: new URL('https://share.transistor.fm/e/episode?subscriber_id=%%{uuid}%%')
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc?m=a1b2c3d4-e5f6-4789-abcd-ef1234567890'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 'https://share.transistor.fm/e/episode?subscriber_id=a1b2c3d4-e5f6-4789-abcd-ef1234567890');
        });

        it('substitutes multiple %%{uuid}%% placeholders in the same URL', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: new URL('https://example.com/path?id=%%{uuid}%%&verify=%%{uuid}%%')
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc?m=f47ac10b-58cc-4372-a567-0e02b2c3d479'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 'https://example.com/path?id=f47ac10b-58cc-4372-a567-0e02b2c3d479&verify=f47ac10b-58cc-4372-a567-0e02b2c3d479');
        });

        it('removes %%{uuid}%% placeholder when m param is missing', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: new URL('https://share.transistor.fm/e/episode?subscriber_id=%%{uuid}%%')
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 'https://share.transistor.fm/e/episode?subscriber_id=');
        });

        it('removes %%{uuid}%% placeholder when m param contains invalid value like unsubstituted Mailgun variable', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: new URL('https://share.transistor.fm/e/episode?subscriber_id=%%{uuid}%%')
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc?m=%%{uuid}%%'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            // Invalid UUID (unsubstituted Mailgun variable) should result in empty string
            sinon.assert.calledWith(res.redirect, 'https://share.transistor.fm/e/episode?subscriber_id=');
        });

        it('does not modify redirect URL when no %%{uuid}%% placeholder is present', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: new URL('https://example.com/normal-link?foo=bar')
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc?m=a1b2c3d4-e5f6-4789-abcd-ef1234567890'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 'https://example.com/normal-link?foo=bar');
        });

        it('substitutes double-encoded %%{uuid}%% placeholder in query string', async function () {
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: {href: 'https://share.transistor.fm/e/episode?subscriber_id=%25%25%7Buuid%7D%25%25'}
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc?m=a1b2c3d4-e5f6-4789-abcd-ef1234567890'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 'https://share.transistor.fm/e/episode?subscriber_id=a1b2c3d4-e5f6-4789-abcd-ef1234567890');
        });

        it('substitutes path-encoded %%{uuid}%% placeholder (braces encoded by URL constructor)', async function () {
            // When %%{uuid}%% is in a URL path, the URL constructor encodes {/} to %7B/%7D
            // producing %%%7Buuid%7D%% which causes decodeURIComponent to fail.
            // The redirect service should normalize braces and still substitute correctly.
            const linkRedirectRepository = {
                getByURL: (url) => {
                    if (url.pathname === '/r/abc') {
                        return Promise.resolve({
                            to: {href: 'https://share.transistor.fm/%%%7Buuid%7D%%/episode'}
                        });
                    }
                    return Promise.resolve(undefined);
                }
            };
            const instance = new LinkRedirectsService({
                linkRedirectRepository,
                config: {
                    baseURL: new URL('https://localhost:2368/')
                }
            });
            const req = {
                originalUrl: '/r/abc?m=a1b2c3d4-e5f6-4789-abcd-ef1234567890'
            };
            const res = {
                redirect: sinon.fake(),
                setHeader: sinon.fake()
            };
            await instance.handleRequest(req, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 'https://share.transistor.fm/a1b2c3d4-e5f6-4789-abcd-ef1234567890/episode');
        });
    });
});
