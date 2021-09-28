const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');

const customRedirects = rewire('../../../../../core/server/web/shared/middlewares/custom-redirects');
const registerRoutes = customRedirects.__get__('_private.registerRoutes');

describe('UNIT: custom redirects', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        req = {
            method: 'GET'
        };
        res = {
            redirect: sinon.spy(),
            set: sinon.spy()
        };

        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    // Related to: https://github.com/TryGhost/Ghost/issues/10898
    it('toURL param takes precedence, other params pass through', function () {
        const redirectsConfig = [{
            permanent: true,
            from: '/test-params',
            to: '/result?q=abc'
        }];
        const redirect = registerRoutes(redirectsConfig);

        req.url = '/test-params/?q=123&lang=js';
        redirect(req, res, next);

        next.called.should.be.false();
        res.redirect.called.should.be.true();
        res.redirect.calledWith(301, '/result?q=abc&lang=js').should.be.true();
        res.set.calledWith({
            'Cache-Control': `public, max-age=0`
        });
    });
});
