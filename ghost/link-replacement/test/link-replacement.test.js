// Switch these lines once there are useful utils
// const testUtils = require('./utils');
const sinon = require('sinon');
const assert = require('assert');
const LinkReplacementService = require('../lib/link-replacement');

describe('LinkReplacementService', function () {
    it('exported', function () {
        assert.equal(require('../index'), LinkReplacementService);
    });

    describe('isSiteDomain', function () {
        const serviceWithout = new LinkReplacementService({
            urlUtils: {
                urlFor: () => 'http://localhost:2368'
            },
            settingsCache: {
                get: () => true
            }
        });

        const serviceWith = new LinkReplacementService({
            urlUtils: {
                urlFor: () => 'http://localhost:2368/dir'
            },
            settingsCache: {
                get: () => true
            }
        });

        it('returns true for the root domain', function () {
            assert(serviceWithout.isSiteDomain(new URL('http://localhost:2368')));
            assert(serviceWith.isSiteDomain(new URL('http://localhost:2368/dir')));
        });

        it('returns true for a path along the root domain', function () {
            assert(serviceWithout.isSiteDomain(new URL('http://localhost:2368/path')));
            assert(serviceWith.isSiteDomain(new URL('http://localhost:2368/dir/path')));
        });

        it('returns false for a different domain', function () {
            assert(!serviceWithout.isSiteDomain(new URL('https://google.com/path')));
            assert(!serviceWith.isSiteDomain(new URL('https://google.com/dir/path')));
        });

        it('returns false if not on same subdirectory', function () {
            assert(!serviceWith.isSiteDomain(new URL('http://localhost:2368/different-dir')));
            // Check if the matching is not dumb and only matches at the start
            assert(!serviceWith.isSiteDomain(new URL('http://localhost:2368/different/dir')));
        });
    });

    describe('replacing links', function () {
        const linkRedirectService = {
            addRedirect: (to) => {
                return Promise.resolve({to, from: 'https://redirected.service/r/ro0sdD92'});
            },
            getSlug: () => {
                return Promise.resolve('slug');
            }
        };
        const service = new LinkReplacementService({
            urlUtils: {
                urlFor: () => 'http://localhost:2368/dir'
            },
            linkRedirectService,
            linkClickTrackingService: {
                addTrackingToRedirect: (link, uuid) => {
                    return Promise.resolve(new URL(`${link.from}?m=${uuid}`));
                }
            },
            attributionService: {
                addEmailSourceAttributionTracking: (url) => {
                    url.searchParams.append('rel', 'newsletter');
                    return url;
                },
                addPostAttributionTracking: (url, post) => {
                    url.searchParams.append('attribution_id', post.id);
                    return url;
                }
            },
            settingsCache: {
                get: () => true
            }
        });

        const disabledService = new LinkReplacementService({
            urlUtils: {
                urlFor: () => 'http://localhost:2368/dir'
            },
            linkRedirectService,
            linkClickTrackingService: {
                addTrackingToRedirect: (link, uuid) => {
                    return Promise.resolve(new URL(`${link.from}?m=${uuid}`));
                }
            },
            attributionService: {
                addEmailSourceAttributionTracking: (url) => {
                    url.searchParams.append('rel', 'newsletter');
                    return url;
                },
                addPostAttributionTracking: (url, post) => {
                    url.searchParams.append('attribution_id', post.id);
                    return url;
                }
            },
            settingsCache: {
                get: () => false
            }
        });

        let redirectSpy;

        beforeEach(function () {
            redirectSpy = sinon.spy(linkRedirectService, 'addRedirect');
        });

        afterEach(function () {
            sinon.restore();
        });

        describe('replaceLink', function () {
            it('returns the redirected URL with uuid', async function () {
                const replaced = await service.replaceLink(new URL('http://localhost:2368/dir/path'), {}, {id: 'post_id'});
                assert.equal(replaced.toString(), 'https://redirected.service/r/ro0sdD92?m=--uuid--');
                assert(redirectSpy.calledOnceWithExactly(new URL('http://localhost:2368/dir/path?rel=newsletter&attribution_id=post_id'), 'slug'));
            });

            it('does not add attribution for external sites', async function () {
                const replaced = await service.replaceLink(new URL('http://external.domain/dir/path'), {}, {id: 'post_id'});
                assert.equal(replaced.toString(), 'https://redirected.service/r/ro0sdD92?m=--uuid--');
                assert(redirectSpy.calledOnceWithExactly(new URL('http://external.domain/dir/path?rel=newsletter'), 'slug'));
            });

            it('does not add attribution or member tracking if click tracking is disabled', async function () {
                const replaced = await disabledService.replaceLink(new URL('http://external.domain/dir/path'), {}, {id: 'post_id'});
                assert.equal(replaced.toString(), 'https://redirected.service/r/ro0sdD92');
                assert(redirectSpy.calledOnceWithExactly(new URL('http://external.domain/dir/path?rel=newsletter'), 'slug'));
            });
        });

        describe('replaceLinks', function () {
            it('Replaces hrefs inside links', async function () {
                const html = '<a href="http://localhost:2368/dir/path">link</a>';
                const expected = '<a href="https://redirected.service/r/ro0sdD92?m=%%{uuid}%%">link</a>';

                const replaced = await service.replaceLinks(html, {}, {id: 'post_id'});
                assert.equal(replaced, expected);
            });

            it('Ignores invalid links', async function () {
                const html = '<a href="%%{unsubscribe_url}%%">link</a>';
                const expected = '<a href="%%{unsubscribe_url}%%">link</a>';

                const replaced = await service.replaceLinks(html, {}, {id: 'post_id'});
                assert.equal(replaced, expected);
            });
        });
    });
});
