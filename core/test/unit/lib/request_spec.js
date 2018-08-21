const should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    nock = require('nock'),
    request = rewire('../../../server/lib/request'),
    sandbox = sinon.sandbox.create();

describe('Request', () => {
    let result;
    let requestMock;
    let secondRequestMock;

    afterEach(() => {
        sandbox.restore();
    });

    it('[success] should return response for http request', done => {
        const url = 'http://some-website.com/endpoint/';

        const expectedResponse =
        {
            body: 'Response body',
            url: 'http://some-website.com/endpoint/',
            statusCode: 200
        };

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };

        requestMock = nock('http://some-website.com')
            .get('/endpoint/')
            .reply(200, 'Response body');

        result = request(url, options).then(res => {
            requestMock.isDone().should.be.true();
            should.exist(res);
            should.exist(res.body);
            res.body.should.be.equal(expectedResponse.body);
            should.exist(res.url);
            res.statusCode.should.be.equal(expectedResponse.statusCode);
            should.exist(res.statusCode);
            res.url.should.be.equal(expectedResponse.url);
            done();
        }).catch(done);
    });

    it('[success] can handle redirect', done => {
        const url = 'http://some-website.com/endpoint/';

        const expectedResponse =
        {
            body: 'Redirected response',
            url: 'http://someredirectedurl.com/files/',
            statusCode: 200
        };

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };

        requestMock = nock('http://some-website.com')
            .get('/endpoint/')
            .reply(301, 'Oops, got redirected',
            {
                location: 'http://someredirectedurl.com/files/'
            });

        secondRequestMock = nock('http://someredirectedurl.com')
            .get('/files/')
            .reply(200, 'Redirected response');

        result = request(url, options).then(res => {
            requestMock.isDone().should.be.true();
            secondRequestMock.isDone().should.be.true();
            should.exist(res);
            should.exist(res.body);
            res.body.should.be.equal(expectedResponse.body);
            should.exist(res.url);
            res.statusCode.should.be.equal(expectedResponse.statusCode);
            should.exist(res.statusCode);
            res.url.should.be.equal(expectedResponse.url);
            done();
        }).catch(done);
    });

    it('[failure] can handle invalid url', done => {
        const url = 'test';

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };

        result = request(url, options)
            .catch(err => {
                should.exist(err);
                err.message.should.be.equal('URL empty or invalid.');
                done();
            });
    });

    it('[failure] can handle empty url', done => {
        const url = '';

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };

        result = request(url, options)
            .catch(err => {
                should.exist(err);
                err.message.should.be.equal('URL empty or invalid.');
                done();
            });
    });

    it('[failure] can handle an error with statuscode not 200', done => {
        const url = 'http://nofilehere.com/files/test.txt';

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };

        requestMock = nock('http://nofilehere.com')
            .get('/files/test.txt')
            .reply(404);

        result = request(url, options)
            .catch(err => {
                requestMock.isDone().should.be.true();
                should.exist(err);
                err.statusMessage.should.be.equal('Not Found');
                done();
            });
    });

    it('[failure] will timeout', done => {
        const url = 'http://nofilehere.com/files/test.txt';

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10
        };

        requestMock = nock('http://nofilehere.com')
            .get('/files/test.txt')
            .socketDelay(100)
            .reply(408);

        result = request(url, options)
            .catch(err => {
                requestMock.isDone().should.be.true();
                should.exist(err);
                err.statusMessage.should.be.equal('Request Timeout');
                done();
            });
    });

    it('[failure] returns error if request errors', done => {
        const url = 'http://nofilehere.com/files/test.txt';

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };

        requestMock = nock('http://nofilehere.com')
            .get('/files/test.txt')
            .reply(500, {message: 'something aweful happend', code: 'AWFUL_ERROR'});

        result = request(url, options)
            .catch(err => {
                requestMock.isDone().should.be.true();
                should.exist(err);
                err.statusMessage.should.be.equal('Internal Server Error');
                done();
            });
    });
});
