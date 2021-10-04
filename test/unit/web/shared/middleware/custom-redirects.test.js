const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const express = require('express');

const customRedirects = rewire('../../../../../core/server/web/shared/middlewares/custom-redirects');
const registerRoutes = customRedirects.__get__('_private.registerRoutes');
const supertest = require('supertest');

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
            set: sinon.spy(),
            writeHead: sinon.spy()
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
        const redirect = registerRoutes(new express.Router(), redirectsConfig);

        req.url = '/test-params/?q=123&lang=js';
        redirect(req, res, next);

        next.called.should.be.false();
        res.redirect.called.should.be.true();
        res.redirect.calledWith(301, '/result?q=abc&lang=js').should.be.true();
        res.set.calledWith({
            'Cache-Control': `public, max-age=0`
        });
    });

    it('the parent app functions even when the middleware gets an invalid redirects configuration', function (done) {
        const redirectsConfig = [{
            permanent: true,
            from: '/invalid_regex/(/size/[a-zA-Z0-9_-.]*/[a-zA-Z0-9_-.]*/[0-9]*/[0-9]*/)([a-zA-Z0-9_-.]*)',
            to: '/'
        }];
        const redirectsService = customRedirects.__get__('redirectsService');
        sinon.stub(redirectsService, 'loadRedirectsFile').returns(redirectsConfig);

        const app = express('test');
        customRedirects.use(app);
        app.get('/', (_req, _res) => _res.status(200).end());

        supertest(app)
            .get('/')
            .expect(200, done);
    });
});
