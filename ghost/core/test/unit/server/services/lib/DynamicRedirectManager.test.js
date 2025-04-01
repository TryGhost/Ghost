const should = require('should');
const DynamicRedirectManager = require('../../../../../core/server/services/lib/DynamicRedirectManager');

const urlJoin = (...parts) => {
    let url = parts.join('/');
    return url.replace(/(^|[^:])\/\/+/g, '$1/');
};

describe('DynamicRedirectManager', function () {
    let headers;
    let status;
    let location;
    let req;
    let res;

    beforeEach(function () {
        headers = null;
        status = null;
        location = null;

        req = {
            method: 'GET'
        };

        res = {
            set(_headers) {
                headers = _headers;
            },
            redirect(_status, _location) {
                status = _status;
                location = _location;
            }
        };
    });

    describe('no subdirectory configuration', function () {
        let manager;

        beforeEach(function () {
            manager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return urlJoin('', pathname);
                }
            });
        });

        it('Prioritizes the query params of the redirect', function () {
            manager.addRedirect('/test-params', '/result?q=abc', {
                permanent: true
            });

            req.url = '/test-params/?q=123&lang=js';

            manager.handleRequest(req, res, function next() {
                should.fail(true, false, 'next should NOT have been called');
            });

            should.equal(headers['Cache-Control'], 'public, max-age=100');
            should.equal(status, 301);
            should.equal(location, '/result?q=abc&lang=js');
        });

        it('Allows redirects to be removed', function () {
            const id = manager.addRedirect('/test-params', '/result?q=abc', {permanent: true});
            manager.removeRedirect(id);

            req.url = '/test-params/?q=123&lang=js';

            manager.handleRequest(req, res, function next() {
                should.ok(true, 'next should have been called');
            });

            should.equal(headers, null);
            should.equal(status, null);
            should.equal(location, null);
        });

        it('Can add same redirect multiple times and remove it once', function () {
            manager.addRedirect('/test-params', '/result?q=abc', {permanent: true});
            const id = manager.addRedirect('/test-params', '/result?q=abc', {permanent: true});
            manager.removeRedirect(id);

            req.url = '/test-params/?q=123&lang=js';

            manager.handleRequest(req, res, function next() {
                should.ok(true, 'next should have been called');
            });

            should.equal(headers, null);
            should.equal(status, null);
            should.equal(location, null);
        });

        it('The routing works when passed an invalid regexp for the from parameter', function () {
            const from = '/invalid_regex/(/size/[a-zA-Z0-9_-.]*/[a-zA-Z0-9_-.]*/[0-9]*/[0-9]*/)([a-zA-Z0-9_-.]*)';
            const to = '/';

            manager.addRedirect(from , to, {
                permanent: false
            });

            req.url = '/test-params/';

            manager.handleRequest(req, res, function next() {
                should.ok(true, 'next should have been called');
            });

            should.equal(headers, null);
            should.equal(status, null);
            should.equal(location, null);
        });

        it('Throws an error if unexpected internal component throws unknown error', function () {
            // override internal behavior to throw an unknown error
            manager.setupRedirect = () => {
                throw new Error('Unknown error');
            };

            const from = '/match-me';
            const to = '/redirect-fails';

            try {
                manager.addRedirect(from , to);
                should.fail(false, 'Should have thrown an error');
            } catch (e) {
                e.message.should.equal('Unknown error');
            }
        });

        it('removes all redirects', function () {
            const from = '/redirect-me';
            const to = '/redirected';

            manager.addRedirect(from , to);

            req.url = '/redirect-me';

            manager.removeAllRedirects();
            manager.redirects.should.be.empty();

            manager.handleRequest(req, res, function next() {
                should.ok(true, 'next should have been called');
            });
        });

        describe('Substitution regex redirects', function () {
            it('Works with substitution redirect case and no trailing slash', function (){
                const from = '^/post/[0-9]+/([a-z0-9\\-]+)';
                const to = '/$1';

                manager.addRedirect(from , to);

                req.url = '/post/10/a-nice-blog-post';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/a-nice-blog-post');
            });

            it('Works with substitution redirect case and a trailing slash', function (){
                const from = '^/post/[0-9]+/([a-z0-9\\-]+)';
                const to = '/$1';

                manager.addRedirect(from , to);

                req.url = '/post/10/a-nice-blog-post/';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/a-nice-blog-post');
            });

            it('Redirects keeping the query params for substitution regexp', function (){
                const from = '^/post/[0-9]+/([a-z0-9\\-]+)';
                const to = '/$1';

                manager.addRedirect(from , to);

                req.url = '/post/10/a-nice-blog-post?a=b';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/a-nice-blog-post?a=b');
            });

            it('Redirects keeping the query params', function (){
                const from = '^\\/topic\\/';
                const to = '/';

                manager.addRedirect(from , to);

                req.url = '/topic?something=good';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/?something=good');
            });
        });

        describe('Case sensitivity', function () {
            it('with case insensitive', function () {
                const from = '/^\\/case-insensitive/i';
                const to = '/redirected-insensitive';

                manager.addRedirect(from , to);

                req.url = '/CaSe-InSeNsItIvE';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/redirected-insensitive');
            });

            it('with case sensitive', function () {
                const from = '^\\/Case-Sensitive';
                const to = '/redirected-sensitive';

                manager.addRedirect(from , to);

                req.url = '/Case-Sensitive';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/redirected-sensitive');
            });

            it('defaults to case sensitive', function () {
                const from = '^\\/Default-Sensitive';
                const to = '/redirected-default';

                manager.addRedirect(from , to);

                req.url = '/Default-Sensitive';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/redirected-default');
            });

            it('should not redirect with case sensitive', function () {
                const from = '^\\/Case-Sensitive';
                const to = '/redirected-insensitive';

                manager.addRedirect(from , to);

                req.url = '/casE-sensitivE';

                manager.handleRequest(req, res, function next() {
                    should.ok(true, 'next should have been called');
                });

                should.equal(headers, null);
                should.equal(status, null);
                should.equal(location, null);
            });

            it('should not redirect with default case sensitive', function () {
                const from = '^\\/Default-Sensitive';
                const to = '/redirected-default';

                manager.addRedirect(from , to);

                req.url = '/defaulT-sensitivE';

                manager.handleRequest(req, res, function next() {
                    should.ok(true, 'next should have been called');
                });

                should.equal(headers, null);
                should.equal(status, null);
                should.equal(location, null);
            });
        });

        describe('External url redirect', function () {
            it('with trailing slash', function () {
                const from = '/external-url';
                const to = 'https://ghost.org';

                manager.addRedirect(from , to);

                req.url = '/external-url/';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, 'https://ghost.org/');
            });

            it('without trailing slash', function () {
                const from = '/external-url';
                const to = 'https://ghost.org';

                manager.addRedirect(from , to);

                req.url = '/external-url';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, 'https://ghost.org/');
            });

            it('with capturing group', function () {
                const from = '/external-url/(.*)';
                const to = 'https://ghost.org/$1';

                manager.addRedirect(from , to);

                req.url = '/external-url/docs';

                manager.handleRequest(req, res, function next() {
                    should.fail(true, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, 'https://ghost.org/docs');
            });
        });

        describe('Url with special character redirect', function () {
            it('redirects urls with special characters', function () {
                const from = '/joloonii-surgaltuud/а-анлал/';
                const to = '/joloonii-angilal/а-ангилал';

                manager.addRedirect(from, to);

                req.url = from;

                manager.handleRequest(req, res, function next() {
                    should.fail(true, false, 'next should NOT have been called');
                });

                // NOTE: max-age is "0" because it's not a permanent redirect
                should.equal(headers['Cache-Control'], 'public, max-age=0');
                should.equal(status, 302);
                should.equal(location, '/joloonii-angilal/а-ангилал');
            });
        });
    });

    describe('with subdirectory configuration', function () {
        let manager;

        beforeEach(function () {
            manager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return urlJoin('', pathname);
                }
            });
        });

        it('should include the subdirectory', function () {
            const from = '/my-old-blog-post/';
            const to = '/revamped-url/';

            manager.addRedirect(from , to, {permanent: true});

            req.url = '/blog/my-old-blog-post/';

            manager.handleRequest(req, res, function next() {
                should.fail(true, 'next should NOT have been called');
            });

            should.equal(headers['Cache-Control'], 'public, max-age=100');
            should.equal(status, 301);
            should.equal(location, '/blog/revamped-url/');
        });
    });
});
