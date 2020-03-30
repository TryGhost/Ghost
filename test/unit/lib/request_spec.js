const should = require('should');
const rewire = require('rewire');
const nock = require('nock');
const request = rewire('../../../core/server/lib/request');

describe('Request', function () {
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

        return request(url, options).then(function (res) {
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

        return request(url, options).then(function (res) {
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

        return request(url, options).then(() => {
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

        return request(url, options).then(() => {
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

        return request(url, options).then(() => {
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
            }
        };

        const requestMock = nock('http://nofilehere.com')
            .get('/files/test.txt')
            .times(3) // 1 original request + 2 default retries
            .reply(500, {message: 'something awful happened', code: 'AWFUL_ERROR'});

        return request(url, options).then(() => {
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
