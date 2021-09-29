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
    it('Prioritises the query params of the redirect', function () {
        const manager = new DynamicRedirectManager({permanentMaxAge: 100}, urlUtils);

        manager.addRedirect('/test-params', '/result?q=abc', {permanent: true});

        const req = {
            method: 'GET',
            url: '/test-params/?q=123&lang=js'
        };

        let headers = null;
        let status = null;
        let location = null;
        const res = {
            set(_headers) {
                headers = _headers;
            },
            redirect(_status, _location) {
                status = _status;
                location = _location;
            }
        };

        manager.handleRequest(req, res, function next() {
            should.fail(true, false, 'next should not have been called');
        });

        should.equal(headers['Cache-Control'], 'public, max-age=100');
        should.equal(status, 301);
        should.equal(location, '/result?q=abc&lang=js');
    });

    it('Allows redirects to be removed', function () {
        const manager = new DynamicRedirectManager({permanentMaxAge: 100}, urlUtils);

        const id = manager.addRedirect('/test-params', '/result?q=abc', {permanent: true});
        manager.removeRedirect(id);

        const req = {
            method: 'GET',
            url: '/test-params/?q=123&lang=js'
        };

        let headers = null;
        let status = null;
        let location = null;
        const res = {
            set(_headers) {
                headers = _headers;
            },
            redirect(_status, _location) {
                status = _status;
                location = _location;
            }
        };

        manager.handleRequest(req, res, function next() {
            should.ok(true, 'next should have been called');
        });

        should.equal(headers, null);
        should.equal(status, null);
        should.equal(location, null);
    });
});
