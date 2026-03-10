const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const nock = require('nock');
const externalRequest = require('../../../../core/server/lib/request-external');
const {isPrivateIp, _installSafeDnsLookup: installSafeDnsLookup} = externalRequest;
const configUtils = require('../../../utils/config-utils');

// for sinon stubs
const dns = require('dns');
const dnsPromises = require('dns').promises;

describe('External Request', function () {
    describe('isPrivateIp', function () {
        // Standard decimal private IPs
        it('detects 10.x.x.x as private', function () {
            assert.equal(isPrivateIp('10.0.0.1'), true);
            assert.equal(isPrivateIp('10.255.255.255'), true);
        });

        it('detects 192.168.x.x as private', function () {
            assert.equal(isPrivateIp('192.168.0.1'), true);
            assert.equal(isPrivateIp('192.168.255.255'), true);
        });

        it('detects 172.16-31.x.x as private', function () {
            assert.equal(isPrivateIp('172.16.0.1'), true);
            assert.equal(isPrivateIp('172.31.255.255'), true);
        });

        it('does not flag 172.15.x.x or 172.32.x.x', function () {
            assert.equal(isPrivateIp('172.15.0.1'), false);
            assert.equal(isPrivateIp('172.32.0.1'), false);
        });

        it('detects 127.x.x.x loopback as private', function () {
            assert.equal(isPrivateIp('127.0.0.1'), true);
            assert.equal(isPrivateIp('127.255.255.255'), true);
        });

        it('detects 169.254.x.x link-local as private', function () {
            assert.equal(isPrivateIp('169.254.0.1'), true);
            assert.equal(isPrivateIp('169.254.169.254'), true);
        });

        it('detects 0.x.x.x as private', function () {
            assert.equal(isPrivateIp('0.0.0.0'), true);
            assert.equal(isPrivateIp('0.255.255.255'), true);
        });

        it('detects 100.64.0.0/10 carrier-grade NAT as private', function () {
            assert.equal(isPrivateIp('100.64.0.1'), true);
            assert.equal(isPrivateIp('100.127.255.255'), true);
            assert.equal(isPrivateIp('100.63.255.255'), false);
            assert.equal(isPrivateIp('100.128.0.1'), false);
        });

        it('detects 198.18.0.0/15 benchmarking as private', function () {
            assert.equal(isPrivateIp('198.18.0.1'), true);
            assert.equal(isPrivateIp('198.19.255.255'), true);
            assert.equal(isPrivateIp('198.17.0.1'), false);
            assert.equal(isPrivateIp('198.20.0.1'), false);
        });

        it('detects 240.0.0.0/4 reserved and broadcast as private', function () {
            assert.equal(isPrivateIp('240.0.0.1'), true);
            assert.equal(isPrivateIp('255.255.255.255'), true);
        });

        it('allows public IPs', function () {
            assert.equal(isPrivateIp('8.8.8.8'), false);
            assert.equal(isPrivateIp('1.1.1.1'), false);
            assert.equal(isPrivateIp('123.123.123.123'), false);
            assert.equal(isPrivateIp('203.0.113.1'), false);
        });

        // Octal bypass attempts
        it('detects octal-encoded loopback 0177.0.0.1 as private', function () {
            assert.equal(isPrivateIp('0177.0.0.1'), true);
        });

        it('detects octal-encoded 10.x 012.0.0.1 as private', function () {
            assert.equal(isPrivateIp('012.0.0.1'), true);
        });

        it('detects octal-encoded 192.168 as private', function () {
            assert.equal(isPrivateIp('0300.0250.0.1'), true);
        });

        // Hex bypass attempts
        it('detects hex-encoded loopback 0x7f.0.0.1 as private', function () {
            assert.equal(isPrivateIp('0x7f.0.0.1'), true);
        });

        it('detects hex-encoded 10.x as private', function () {
            assert.equal(isPrivateIp('0x0a.0.0.1'), true);
        });

        it('detects hex-encoded 192.168.x.x as private', function () {
            assert.equal(isPrivateIp('0xc0.0xa8.0.1'), true);
        });

        // Mixed notation bypass attempts
        it('detects mixed octal/hex/decimal notation as private', function () {
            assert.equal(isPrivateIp('0x7f.0.0.01'), true); // 127.0.0.1 with hex + octal
            assert.equal(isPrivateIp('0xa.0x0.0.01'), true); // 10.0.0.1 with hex + octal
        });

        // Integer (single-number) bypass attempts
        it('detects integer-encoded loopback 2130706433 as private', function () {
            assert.equal(isPrivateIp('2130706433'), true); // 127.0.0.1
        });

        it('detects integer-encoded 10.0.0.1 as private', function () {
            assert.equal(isPrivateIp('167772161'), true); // 10.0.0.1
        });

        it('detects integer-encoded 192.168.0.1 as private', function () {
            assert.equal(isPrivateIp('3232235521'), true); // 192.168.0.1
        });

        it('allows integer-encoded public IPs', function () {
            assert.equal(isPrivateIp('134744072'), false); // 8.8.8.8
        });

        // IPv6 addresses
        it('detects IPv6 loopback ::1 as private', function () {
            assert.equal(isPrivateIp('::1'), true);
        });

        it('detects IPv6 unspecified :: as private', function () {
            assert.equal(isPrivateIp('::'), true);
        });

        it('detects IPv6 unique local fc00::/7 as private', function () {
            assert.equal(isPrivateIp('fc00::1'), true);
            assert.equal(isPrivateIp('fd12:3456:789a::1'), true);
        });

        it('detects expanded IPv6 loopback 0:0:0:0:0:0:0:1 as private', function () {
            assert.equal(isPrivateIp('0:0:0:0:0:0:0:1'), true);
            assert.equal(isPrivateIp('0000:0000:0000:0000:0000:0000:0000:0001'), true);
        });

        it('detects expanded IPv6 unspecified 0:0:0:0:0:0:0:0 as private', function () {
            assert.equal(isPrivateIp('0:0:0:0:0:0:0:0'), true);
            assert.equal(isPrivateIp('0000:0000:0000:0000:0000:0000:0000:0000'), true);
        });

        it('detects IPv6 link-local fe80::/10 as private', function () {
            assert.equal(isPrivateIp('fe80::1'), true);
            assert.equal(isPrivateIp('fe9f::1'), true);
            assert.equal(isPrivateIp('feaf::1'), true);
            assert.equal(isPrivateIp('febf::1'), true);
        });

        it('detects IPv4-mapped IPv6 addresses as private (dotted notation)', function () {
            assert.equal(isPrivateIp('::ffff:127.0.0.1'), true);
            assert.equal(isPrivateIp('::ffff:10.0.0.1'), true);
            assert.equal(isPrivateIp('::ffff:192.168.0.1'), true);
        });

        it('detects IPv4-mapped IPv6 addresses as private (hex notation)', function () {
            assert.equal(isPrivateIp('::ffff:7f00:1'), true); // 127.0.0.1
            assert.equal(isPrivateIp('::ffff:a00:1'), true); // 10.0.0.1
            assert.equal(isPrivateIp('::ffff:c0a8:1'), true); // 192.168.0.1
            assert.equal(isPrivateIp('::ffff:a9fe:1'), true); // 169.254.0.1
        });

        it('detects expanded IPv4-mapped IPv6 addresses as private (dotted notation)', function () {
            assert.equal(isPrivateIp('0:0:0:0:0:ffff:127.0.0.1'), true);
            assert.equal(isPrivateIp('0:0:0:0:0:ffff:10.0.0.1'), true);
            assert.equal(isPrivateIp('0:0:0:0:0:ffff:192.168.0.1'), true);
            assert.equal(isPrivateIp('0:0:0:0:0:ffff:169.254.169.254'), true);
            assert.equal(isPrivateIp('0000:0000:0000:0000:0000:ffff:127.0.0.1'), true);
        });

        it('allows public expanded IPv4-mapped IPv6 addresses', function () {
            assert.equal(isPrivateIp('0:0:0:0:0:ffff:8.8.8.8'), false);
            assert.equal(isPrivateIp('0000:0000:0000:0000:0000:ffff:8.8.8.8'), false);
        });

        it('allows public IPv4-mapped IPv6 addresses (dotted notation)', function () {
            assert.equal(isPrivateIp('::ffff:8.8.8.8'), false);
        });

        it('allows public IPv4-mapped IPv6 addresses (hex notation)', function () {
            assert.equal(isPrivateIp('::ffff:808:808'), false); // 8.8.8.8
        });

        // Edge cases - fail closed
        it('treats empty string as private (fail closed)', function () {
            assert.equal(isPrivateIp(''), true);
        });

        it('treats null/undefined as private (fail closed)', function () {
            assert.equal(isPrivateIp(null), true);
            assert.equal(isPrivateIp(undefined), true);
        });

        it('treats unrecognized format as private (fail closed)', function () {
            assert.equal(isPrivateIp('not-an-ip'), true);
        });
    });

    describe('with private ip', function () {
        beforeEach(function () {
            // this can be stubbed already by our general disableNetwork() call in test overrides
            dnsPromises.lookup.restore?.();

            sinon.stub(dnsPromises, 'lookup').callsFake(function () {
                return Promise.resolve({address: '192.168.0.1'});
            });
        });

        afterEach(async function () {
            await configUtils.restore();
            sinon.restore();
            nock.cleanAll();
        });

        it('allows configured hostname', function () {
            configUtils.set('url', 'http://example.com');

            const url = 'http://example.com/endpoint/';
            const expectedResponse = {
                body: 'Response body',
                url: 'http://example.com/endpoint/',
                statusCode: 200
            };
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://example.com')
                .get('/endpoint/')
                .reply(200, 'Response body');

            return externalRequest(url, options).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assertExists(res.body);
                assert.equal(res.body, expectedResponse.body);
                assertExists(res.url);
                assert.equal(res.statusCode, expectedResponse.statusCode);
                assertExists(res.statusCode);
                assert.equal(res.url, expectedResponse.url);
            });
        });

        it('allows configured hostname+port', function () {
            configUtils.set('url', 'http://example.com:2368');

            const url = 'http://example.com:2368/endpoint/';
            const expectedResponse = {
                body: 'Response body',
                url: 'http://example.com:2368/endpoint/',
                statusCode: 200
            };
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://example.com:2368')
                .get('/endpoint/')
                .reply(200, 'Response body');

            return externalRequest(url, options).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assertExists(res.body);
                assert.equal(res.body, expectedResponse.body);
                assertExists(res.url);
                assert.equal(res.statusCode, expectedResponse.statusCode);
                assertExists(res.statusCode);
                assert.equal(res.url, expectedResponse.url);
            });
        });

        it('blocks configured hostname with incorrect port', function () {
            configUtils.set('url', 'http://example.com');

            const url = 'http://example.com:1234/endpoint/';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            return externalRequest(url, options).then(() => {
                throw new Error('Request should have rejected with non-permitted IP message');
            }, (err) => {
                assertExists(err);
                assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
            });
        });

        it('blocks configured hostname+port with incorrect port', function () {
            configUtils.set('url', 'http://example.com:2368');

            const url = 'http://example.com:1234/endpoint/';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            return externalRequest(url, options).then(() => {
                throw new Error('Request should have rejected with non-permitted IP message');
            }, (err) => {
                assertExists(err);
                assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
            });
        });

        it('blocks on request', function () {
            const url = 'http://some-website.com/';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://some-website.com')
                .get('/files/')
                .reply(200, 'Response');

            return externalRequest(url, options).then(function () {
                throw new Error('Request should have rejected with non-permitted IP message');
            }, (err) => {
                assertExists(err);
                assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
                assert.equal(requestMock.isDone(), false);
            });
        });

        it('blocks on redirect', function () {
            configUtils.set('url', 'http://some-website.com');

            const url = 'http://some-website.com/endpoint/';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://some-website.com')
                .get('/endpoint/')
                .reply(301, 'Oops, got redirected',
                    {
                        location: 'http://someredirectedurl.com/files/'
                    });

            const secondRequestMock = nock('http://someredirectedurl.com')
                .get('/files/')
                .reply(200, 'Redirected response');

            return externalRequest(url, options).then(function () {
                throw new Error('Request should have rejected with non-permitted IP message');
            }, (err) => {
                assertExists(err);
                assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
                assert.equal(requestMock.isDone(), true);
                assert.equal(secondRequestMock.isDone(), false);
            });
        });
    });

    describe('general behavior', function () {
        beforeEach(function () {
            sinon.stub(dnsPromises, 'lookup').callsFake(function () {
                return Promise.resolve({address: '123.123.123.123'});
            });
        });

        afterEach(async function () {
            await configUtils.restore();
            sinon.restore();
            nock.cleanAll();
        });

        it('[success] should return response for http request', function () {
            const url = 'http://some-website.com/endpoint/';
            const expectedResponse = {
                body: 'Response body',
                url: 'http://some-website.com/endpoint/',
                statusCode: 200
            };
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://some-website.com')
                .get('/endpoint/')
                .reply(200, 'Response body');

            return externalRequest(url, options).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assertExists(res);
                assertExists(res.body);
                assert.equal(res.body, expectedResponse.body);
                assertExists(res.url);
                assert.equal(res.statusCode, expectedResponse.statusCode);
                assertExists(res.statusCode);
                assert.equal(res.url, expectedResponse.url);
            });
        });

        it('[success] can handle redirect', function () {
            const url = 'http://some-website.com/endpoint/';
            const expectedResponse = {
                body: 'Redirected response',
                url: 'http://someredirectedurl.com/files/',
                statusCode: 200
            };
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://some-website.com')
                .get('/endpoint/')
                .reply(301, 'Oops, got redirected',
                    {
                        location: 'http://someredirectedurl.com/files/'
                    });

            const secondRequestMock = nock('http://someredirectedurl.com')
                .get('/files/')
                .reply(200, 'Redirected response');

            return externalRequest(url, options).then(function (res) {
                assert.equal(requestMock.isDone(), true);
                assert.equal(secondRequestMock.isDone(), true);
                assertExists(res);
                assertExists(res.body);
                assert.equal(res.body, expectedResponse.body);
                assertExists(res.url);
                assert.equal(res.statusCode, expectedResponse.statusCode);
                assertExists(res.statusCode);
                assert.equal(res.url, expectedResponse.url);
            });
        });

        it('[failure] can handle invalid url', function () {
            const url = 'test';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            return externalRequest(url, options).then(() => {
                throw new Error('Request should have rejected with invalid url message');
            }, (err) => {
                assertExists(err);
                assert.equal(err.code, 'ERR_INVALID_URL');
            });
        });

        it('[failure] can handle empty url', function () {
            const url = '';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            return externalRequest(url, options).then(() => {
                throw new Error('Request should have rejected with invalid url message');
            }, (err) => {
                assertExists(err);
                // got v11+ throws an error instead of the external requests lib
                assert.equal(err.message, 'No URL protocol specified');
            });
        });

        it('[failure] can handle an error with statuscode not 200', function () {
            const url = 'http://nofilehere.com/files/test.txt';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const requestMock = nock('http://nofilehere.com')
                .get('/files/test.txt')
                .reply(404);

            return externalRequest(url, options).then(() => {
                throw new Error('Request should have errored');
            }, (err) => {
                assert.equal(requestMock.isDone(), true);
                assertExists(err);
                assert.equal(err.response.statusMessage, 'Not Found');
            });
        });

        it('[failure] returns error if request errors', function () {
            const url = 'http://nofilehere.com/files/test.txt';
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                retry: 0
            };

            const requestMock = nock('http://nofilehere.com')
                .get('/files/test.txt')
                .reply(500, {message: 'something awful happened', code: 'AWFUL_ERROR'});

            return externalRequest(url, options).then(() => {
                throw new Error('Request should have errored with an awful error');
            }, (err) => {
                assert.equal(requestMock.isDone(), true);
                assertExists(err);
                assert.equal(err.response.statusMessage, `Internal Server Error`);
            });
        });
    });

    describe('DNS rebinding protection (installSafeDnsLookup)', function () {
        beforeEach(function () {
            // Restore any existing stubs from global disableNetwork()
            dns.lookup.restore?.();
        });

        afterEach(async function () {
            await configUtils.restore();
            sinon.restore();
        });

        it('installs a lookup function on request options', async function () {
            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            assert.equal(typeof options.lookup, 'function');
        });

        it('does not install lookup for the configured site URL', async function () {
            configUtils.set('url', 'http://example.com');

            const options = {
                url: new URL('http://example.com/endpoint')
            };

            await installSafeDnsLookup(options);

            assert.equal(options.lookup, undefined);
        });

        it('does not install lookup for the configured site URL with port', async function () {
            configUtils.set('url', 'http://example.com:2368');

            const options = {
                url: new URL('http://example.com:2368/endpoint')
            };

            await installSafeDnsLookup(options);

            assert.equal(options.lookup, undefined);
        });

        it('installs lookup when port does not match site URL', async function () {
            configUtils.set('url', 'http://example.com:2368');

            const options = {
                url: new URL('http://example.com:9999/endpoint')
            };

            await installSafeDnsLookup(options);

            assert.equal(typeof options.lookup, 'function');
        });

        it('dnsLookup allows public IPs', async function () {
            sinon.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }
                if (opts && opts.all) {
                    return cb(null, [{address: '8.8.8.8', family: 4}]);
                }
                cb(null, '8.8.8.8', 4);
            });

            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            await new Promise((resolve, reject) => {
                options.lookup('attacker.com', {}, (err, address, family) => {
                    if (err) {
                        return reject(err);
                    }
                    assert.equal(address, '8.8.8.8');
                    assert.equal(family, 4);
                    resolve();
                });
            });
        });

        it('dnsLookup blocks private IPs', async function () {
            sinon.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }
                if (opts && opts.all) {
                    return cb(null, [{address: '169.254.169.254', family: 4}]);
                }
                cb(null, '169.254.169.254', 4);
            });

            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            await new Promise((resolve, reject) => {
                options.lookup('attacker.com', {}, (err) => {
                    if (err) {
                        assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
                        assert.equal(err.code, 'URL_PRIVATE_INVALID');
                        return resolve();
                    }
                    reject(new Error('Should have blocked private IP'));
                });
            });
        });

        it('dnsLookup blocks loopback IPs', async function () {
            sinon.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }
                if (opts && opts.all) {
                    return cb(null, [{address: '127.0.0.1', family: 4}]);
                }
                cb(null, '127.0.0.1', 4);
            });

            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            await new Promise((resolve, reject) => {
                options.lookup('attacker.com', {}, (err) => {
                    if (err) {
                        assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
                        return resolve();
                    }
                    reject(new Error('Should have blocked loopback IP'));
                });
            });
        });

        it('dnsLookup blocks private IPs in array mode (all: true)', async function () {
            sinon.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }
                if (opts && opts.all) {
                    return cb(null, [
                        {address: '8.8.8.8', family: 4},
                        {address: '127.0.0.1', family: 4}
                    ]);
                }
                cb(null, '8.8.8.8', 4);
            });

            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            await new Promise((resolve, reject) => {
                options.lookup('attacker.com', {all: true}, (err) => {
                    if (err) {
                        assert.equal(err.message, 'URL resolves to a non-permitted private IP block');
                        assert.equal(err.code, 'URL_PRIVATE_INVALID');
                        return resolve();
                    }
                    reject(new Error('Should have blocked private IP in array'));
                });
            });
        });

        it('dnsLookup allows public IPs in array mode (all: true)', async function () {
            sinon.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }
                if (opts && opts.all) {
                    return cb(null, [
                        {address: '8.8.8.8', family: 4},
                        {address: '1.1.1.1', family: 4}
                    ]);
                }
                cb(null, '8.8.8.8', 4);
            });

            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            await new Promise((resolve, reject) => {
                options.lookup('attacker.com', {all: true}, (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    assert.equal(results.length, 2);
                    assert.equal(results[0].address, '8.8.8.8');
                    assert.equal(results[1].address, '1.1.1.1');
                    resolve();
                });
            });
        });

        it('dnsLookup passes through DNS errors', async function () {
            const dnsError = new Error('ENOTFOUND');
            sinon.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }
                cb(dnsError, null, null);
            });

            const options = {
                url: new URL('http://attacker.com/endpoint')
            };

            await installSafeDnsLookup(options);

            await new Promise((resolve, reject) => {
                options.lookup('attacker.com', {}, (err) => {
                    if (err) {
                        assert.equal(err.message, 'ENOTFOUND');
                        return resolve();
                    }
                    reject(new Error('Should have passed through DNS error'));
                });
            });
        });
    });
});
