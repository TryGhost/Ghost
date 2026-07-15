const sinon = require('sinon');
const assert = require('node:assert/strict');

const Manager = require('../../../../../core/frontend/services/sitemap/site-map-manager');
const handler = require('../../../../../core/frontend/services/sitemap/handler');

describe('Unit: sitemap/handler', function () {
    let sandbox;
    let routes;
    let res;
    let next;

    function register() {
        routes = {};
        handler({
            get(path, ...handlers) {
                routes[path] = handlers.at(-1);
            }
        });
    }

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(Manager.prototype, 'getIndexXml').resolves('<index/>');
        sandbox.stub(Manager.prototype, 'getSiteMapXml').resolves('<posts/>');
        res = {set: sandbox.stub(), send: sandbox.stub(), sendStatus: sandbox.stub()};
        next = sandbox.stub();
        register();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('serves the index', async function () {
        await routes['/sitemap.xml']({}, res, next);

        sinon.assert.calledWith(res.send, '<index/>');
        sinon.assert.notCalled(next);
    });

    it('serves a resource sitemap', async function () {
        await routes['/sitemap-:resource.xml']({params: {resource: 'posts'}}, res, next);

        sinon.assert.calledWith(res.send, '<posts/>');
        sinon.assert.notCalled(next);
    });

    it('forwards a failed XML read to the error handler instead of hanging the request', async function () {
        // Express 4 does not forward async handler rejections — see handler.js.
        const buildError = new Error('connection lost');
        Manager.prototype.getIndexXml.rejects(buildError);
        Manager.prototype.getSiteMapXml.rejects(buildError);

        await routes['/sitemap.xml']({}, res, next);
        await routes['/sitemap-:resource.xml']({params: {resource: 'posts'}}, res, next);

        sinon.assert.calledTwice(next);
        assert.equal(next.firstCall.args[0], buildError);
        assert.equal(next.secondCall.args[0], buildError);
        sinon.assert.notCalled(res.send);
    });
});
