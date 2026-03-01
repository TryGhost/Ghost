const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const configUtils = require('../../../../../utils/config-utils');

let cors = rewire('../../../../../../core/server/web/members/middleware/cors');

describe('members cors middleware', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        req = {
            method: 'OPTIONS',
            headers: {
                origin: null
            },
            client: {}
        };

        res = {
            headers: {},
            getHeader: function () {
            },
            vary: sinon.spy(),
            setHeader: function (h, v) {
                this.headers[h] = v;
            },
            end: sinon.spy()
        };

        next = sinon.spy();
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
        cors = rewire('../../../../../../core/server/web/members/middleware/cors');
    });

    it('should return wildcard without a request origin header', function () {
        req.get = sinon.stub().withArgs('origin').returns(null);

        cors(req, res, next);

        sinon.assert.calledOnce(res.end);
        assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
    });

    it('should be enabled when origin matches config.url host', function () {
        configUtils.set({url: 'https://my.blog'});

        const origin = 'http://my.blog';
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        sinon.assert.calledOnce(res.end);
        assert.equal(res.headers['Access-Control-Allow-Origin'], origin);
    });

    it('should be enabled when origin matches config.admin.url host', function () {
        configUtils.set({
            url: 'https://my.blog',
            admin: {
                url: 'https://admin.my.blog'
            }
        });

        const origin = 'http://admin.my.blog';
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        sinon.assert.calledOnce(res.end);
        assert.equal(res.headers['Access-Control-Allow-Origin'], origin);
    });

    it('should return wildcard for origins outside of config.url and config.admin.url', function () {
        configUtils.set({
            url: 'https://my.blog',
            admin: {
                url: 'https://admin.my.blog'
            }
        });

        const origin = 'http://not-trusted.com';
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        sinon.assert.calledOnce(res.end);
        assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
    });

    it('should return wildcard for invalid origins', function () {
        configUtils.set({
            url: 'https://my.blog',
            admin: {
                url: 'https://admin.my.blog'
            }
        });

        const origin = '://not-valid-origin';
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        sinon.assert.calledOnce(res.end);
        assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
    });
});
