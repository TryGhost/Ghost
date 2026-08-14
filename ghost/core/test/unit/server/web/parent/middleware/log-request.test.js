const {EventEmitter} = require('node:events');
const sinon = require('sinon');

const logging = require('@tryghost/logging');
const configUtils = require('../../../../../utils/config-utils');

const logRequest = require('../../../../../../core/server/web/parent/middleware/log-request');

describe('Log request middleware', function () {
    beforeEach(function () {
        sinon.stub(logging, 'error');
        sinon.stub(logging, 'warn');
        sinon.stub(logging, 'info');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    function createReq({statusCode} = {}) {
        const req = {};
        if (statusCode !== undefined) {
            req.err = {statusCode};
        }
        return req;
    }

    function run(req) {
        // res behaves like the real Express response: an EventEmitter that the
        // middleware subscribes to, then fires logResponse on 'finish'.
        const res = new EventEmitter();
        const next = sinon.stub();

        logRequest(req, res, next);
        res.emit('finish');

        return {res, next};
    }

    it('logs a 500 request error via logging.error', function () {
        run(createReq({statusCode: 500}));

        sinon.assert.calledOnce(logging.error);
        sinon.assert.notCalled(logging.warn);
        sinon.assert.notCalled(logging.info);
    });

    it('logs a 4xx request error via logging.warn when logClientErrorsAsError is false', function () {
        configUtils.set('logging:logClientErrorsAsError', false);

        run(createReq({statusCode: 422}));

        sinon.assert.calledOnce(logging.warn);
        sinon.assert.notCalled(logging.error);
        sinon.assert.notCalled(logging.info);
    });

    it('logs a 4xx request error via logging.error when logClientErrorsAsError is true', function () {
        configUtils.set('logging:logClientErrorsAsError', true);

        run(createReq({statusCode: 422}));

        sinon.assert.calledOnce(logging.error);
        sinon.assert.notCalled(logging.warn);
        sinon.assert.notCalled(logging.info);
    });

    it('logs a 404 request error via logging.info', function () {
        run(createReq({statusCode: 404}));

        sinon.assert.calledOnce(logging.info);
        sinon.assert.notCalled(logging.error);
        sinon.assert.notCalled(logging.warn);
    });
});
