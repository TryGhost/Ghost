const assert = require('node:assert/strict');
const sinon = require('sinon');
const shared = require('../');

describe('HTTP', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = sinon.stub();
        res = sinon.stub();
        next = sinon.stub();

        req.body = {
            a: 'a'
        };
        req.vhost = {
            host: 'example.com'
        };
        req.get = sinon.stub().returns('fallback.example.com');
        req.originalUrl = '/ghost/api/content/posts/';
        req.secure = true;
        req.url = 'https://example.com/ghost/api/content/',

        res.status = sinon.stub();
        res.json = sinon.stub();
        res.set = (headers) => {
            res.headers = headers;
        };
        res.send = sinon.stub();

        sinon.stub(shared.headers, 'get').resolves();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('check options', function () {
        const apiImpl = sinon.stub().resolves();
        shared.http(apiImpl)(req, res, next);

        assert.deepEqual(Object.keys(apiImpl.args[0][0]), [
            'original',
            'options',
            'data',
            'user',
            'file',
            'files',
            'apiType',
            'docName',
            'method',
            'response'
        ]);

        assert.deepEqual(apiImpl.args[0][0].data, {a: 'a'});
        assert.deepEqual(apiImpl.args[0][0].options, {
            context: {
                api_key: null,
                integration: null,
                user: null,
                member: null
            }
        });
    });

    it('api response is fn', function (done) {
        const response = sinon.stub().callsFake(function (_req, _res, _next) {
            assert.ok(_req);
            assert.ok(_res);
            assert.ok(_next);
            assert.equal(apiImpl.calledOnce, true);
            assert.equal(_res.json.called, false);
            done();
        });

        const apiImpl = sinon.stub().resolves(response);
        shared.http(apiImpl)(req, res, next);
    });

    it('api response is fn (data)', function (done) {
        const apiImpl = sinon.stub().resolves('data');

        next.callsFake(done);

        res.json.callsFake(function () {
            assert.equal(shared.headers.get.calledOnce, true);
            assert.equal(res.status.calledOnce, true);
            assert.equal(res.send.called, false);
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });

    it('handles api key, user and plain text response', function (done) {
        req.vhost = null;
        req.user = {id: 'user-id'};
        req.api_key = {
            get(key) {
                return {
                    id: 'api-key-id',
                    type: 'admin',
                    integration_id: 'integration-id'
                }[key];
            }
        };

        const apiImpl = sinon.stub().resolves('plain body');
        apiImpl.response = {format: 'plain'};
        apiImpl.statusCode = 201;

        res.send.callsFake(() => {
            assert.equal(res.status.calledOnceWithExactly(201), true);
            assert.equal(res.headers.constructor, Object);
            assert.equal(res.json.called, false);

            const frame = apiImpl.args[0][0];
            assert.equal(frame.options.context.api_key.id, 'api-key-id');
            assert.equal(frame.options.context.integration.id, 'integration-id');
            assert.equal(frame.options.context.user, 'user-id');
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });

    it('supports async response format and statusCode function', function (done) {
        const apiImpl = sinon.stub().resolves({ok: true});
        apiImpl.statusCode = sinon.stub().returns(204);
        apiImpl.response = {
            format() {
                return Promise.resolve('plain');
            }
        };

        res.send.callsFake(() => {
            assert.equal(apiImpl.statusCode.calledOnce, true);
            assert.equal(res.status.calledOnceWithExactly(204), true);
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });

    it('supports sync response format function', function (done) {
        const apiImpl = sinon.stub().resolves('plain body');
        apiImpl.response = {
            format() {
                return 'plain';
            }
        };

        res.send.callsFake(() => {
            assert.equal(res.send.calledOnce, true);
            assert.equal(res.json.called, false);
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });

    it('passes errors to next with frame options', function (done) {
        const error = new Error('failure');
        const apiImpl = sinon.stub().rejects(error);

        next.callsFake((err) => {
            assert.equal(err, error);
            assert.deepEqual(req.frameOptions, {
                docName: null,
                method: null
            });
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });

    it('uses req.url pathname when originalUrl is missing', function (done) {
        req.originalUrl = undefined;
        req.url = '/ghost/api/content/posts/?include=authors';

        const apiImpl = sinon.stub().resolves({});
        res.json.callsFake(() => {
            const frame = apiImpl.args[0][0];
            assert.equal(frame.original.url.pathname, '/ghost/api/content/posts/');
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });
});
