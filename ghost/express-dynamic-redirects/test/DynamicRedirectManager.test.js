const should = require('should');
const DynamicRedirectManager = require('../');

const urlUtils = {
    getSubdir() {
        return '';
    },
    urlJoin(...parts) {
        let url = parts.join('/');
        return url.replace(/(^|[^:])\/\/+/g, '$1/');
    }
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

    it('Prioritizes the query params of the redirect', function () {
        const manager = new DynamicRedirectManager({
            permanentMaxAge: 100,
            getSubdirectoryURL: (pathname) => {
                return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
            }
        });

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
        const manager = new DynamicRedirectManager({
            permanentMaxAge: 100,
            getSubdirectoryURL: (pathname) => {
                return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
            }
        });
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
        const manager = new DynamicRedirectManager({
            permanentMaxAge: 100,
            getSubdirectoryURL: (pathname) => {
                return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
            }
        });
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

    describe('Substitution regex redirects', function () {
        it('Works with substitution redirect case and no trailing slash', function (){
            const manager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
                }
            });
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
            const manager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
                }
            });
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
            const manager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
                }
            });

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
            const manager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
                }
            });

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
});
