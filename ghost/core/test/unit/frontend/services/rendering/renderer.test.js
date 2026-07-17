const sinon = require('sinon');
const renderer = require('../../../../../core/frontend/services/rendering/renderer');

describe('Renderer', function () {
    let req;
    let res;

    beforeEach(function () {
        req = {
            originalUrl: '/',
            params: {},
            body: {}
        };
        res = {
            locals: {},
            routerOptions: {},
            // pre-set so templates.setTemplate returns early
            _template: 'index',
            render: sinon.stub().callsArgWith(2, null, '<html></html>'),
            send: sinon.spy(),
            set: sinon.spy(),
            get: sinon.stub().returns(undefined)
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('sends the rendered html without extra headers by default', function () {
        renderer(req, res, {});

        sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
        sinon.assert.notCalled(res.set);
    });

    it('caps public caching at 60s when the render was degraded', function () {
        res.locals.degradedRender = true;
        res.get.withArgs('Cache-Control').returns('public, max-age=600');

        renderer(req, res, {});

        sinon.assert.calledWithExactly(res.set, 'Cache-Control', 'public, max-age=60');
        sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
        sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
    });

    it('does not raise max-age above the existing public value on a degraded render', function () {
        res.locals.degradedRender = true;
        res.get.withArgs('Cache-Control').returns('public, max-age=0');

        renderer(req, res, {});

        sinon.assert.calledWithExactly(res.set, 'Cache-Control', 'public, max-age=0');
        sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
    });

    it('leaves private responses uncacheable on a degraded render', function () {
        res.locals.degradedRender = true;
        res.get.withArgs('Cache-Control').returns('no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

        renderer(req, res, {});

        sinon.assert.neverCalledWith(res.set, 'Cache-Control');
        sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
        sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
    });

    it('does not add caching headers when none were set on a degraded render', function () {
        res.locals.degradedRender = true;

        renderer(req, res, {});

        sinon.assert.neverCalledWith(res.set, 'Cache-Control');
        sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
    });

    it('forwards render errors without sending a response', function () {
        req.next = sinon.spy();
        res.render = sinon.stub().callsArgWith(2, new Error('render failed'));

        renderer(req, res, {});

        sinon.assert.calledOnce(req.next);
        sinon.assert.notCalled(res.send);
    });
});
