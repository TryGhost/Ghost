const sinon = require('sinon');
const should = require('should');
const nock = require('nock');
const externalRequest = require('../../../../core/server/lib/request-external');
const configUtils = require('../../../utils/configUtils');

// for sinon stubs
const dnsPromises = require('dns').promises;

describe('External Request', function () {
    describe('with private ip', function () {
        beforeEach(function () {
            sinon.stub(dnsPromises, 'lookup').callsFake(function () {
                return Promise.resolve({address: '192.168.0.1'});
            });
        });

        afterEach(function () {
            configUtils.restore();
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
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.body);
                res.body.should.be.equal(expectedResponse.body);
                should.exist(res.url);
                res.statusCode.should.be.equal(expectedResponse.statusCode);
                should.exist(res.statusCode);
                res.url.should.be.equal(expectedResponse.url);
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
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.body);
                res.body.should.be.equal(expectedResponse.body);
                should.exist(res.url);
                res.statusCode.should.be.equal(expectedResponse.statusCode);
                should.exist(res.statusCode);
                res.url.should.be.equal(expectedResponse.url);
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
                should.exist(err);
                err.message.should.be.equal('URL resolves to a non-permitted private IP block');
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
                should.exist(err);
                err.message.should.be.equal('URL resolves to a non-permitted private IP block');
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
                should.exist(err);
                err.message.should.be.equal('URL resolves to a non-permitted private IP block');
                requestMock.isDone().should.be.false();
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
                should.exist(err);
                err.message.should.be.equal('URL resolves to a non-permitted private IP block');
                requestMock.isDone().should.be.true();
                secondRequestMock.isDone().should.be.false();
            });
        });
    });

    describe('general behaviour', function () {
        beforeEach(function () {
            sinon.stub(dnsPromises, 'lookup').callsFake(function (host) {
                return Promise.resolve({address: '123.123.123.123'});
            });
        });

        afterEach(function () {
            configUtils.restore();
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
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.body);
                res.body.should.be.equal(expectedResponse.body);
                should.exist(res.url);
                res.statusCode.should.be.equal(expectedResponse.statusCode);
                should.exist(res.statusCode);
                res.url.should.be.equal(expectedResponse.url);
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
                requestMock.isDone().should.be.true();
                secondRequestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.body);
                res.body.should.be.equal(expectedResponse.body);
                should.exist(res.url);
                res.statusCode.should.be.equal(expectedResponse.statusCode);
                should.exist(res.statusCode);
                res.url.should.be.equal(expectedResponse.url);
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
                should.exist(err);
                err.message.should.be.equal('URL empty or invalid.');
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
                should.exist(err);
                err.message.should.be.equal('URL empty or invalid.');
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
                requestMock.isDone().should.be.true();
                should.exist(err);
                err.statusMessage.should.be.equal('Not Found');
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
                requestMock.isDone().should.be.true();
                should.exist(err);
                err.statusMessage.should.be.equal('Internal Server Error');
                err.body.should.match(/something awful happened/);
                err.body.should.match(/AWFUL_ERROR/);
            });
        });
    });
});
