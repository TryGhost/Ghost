const sinon = require('sinon');
const prettyUrls = require('../../../../../../core/server/web/shared/middleware/pretty-urls');

describe('Middleware: prettyUrls', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = {
            path: '',
            url: ''
        };
        res = {
            redirect: sinon.spy(),
            setHeader: sinon.spy(),
            set: sinon.spy()
        };
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('skips trailing slash redirects for markdown paths', function () {
        req.path = '/coming-soon.md';
        req.url = req.path;

        prettyUrls[0](req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(res.redirect);
    });

    it('skips trailing slash redirects for other file paths', function () {
        req.path = '/llms.txt';
        req.url = req.path;

        prettyUrls[0](req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(res.redirect);
    });
});
