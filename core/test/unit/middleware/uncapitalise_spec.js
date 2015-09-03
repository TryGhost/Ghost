/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var sinon           = require('sinon'),
    uncapitalise    = require('../../../server/middleware/uncapitalise');

describe('Middleware: uncapitalise', function () {
    var sandbox,
        res,
        req,
        next;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        res = sinon.spy();
        req = sinon.spy();
        next = sinon.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('A signup or reset request', function () {
        it('does nothing if there are no capital letters', function (done) {
            req.path = '/ghost/signup';
            uncapitalise(req, res, next);

            next.should.be.calledOnce;
            done();
        });

        it('redirects to the lower case slug if there are capital letters', function (done) {
            req.path = '/ghost/SignUP';
            req.url = 'http://localhost' + req.path;
            res = {
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            uncapitalise(req, res, next);

            next.should.not.be.called;
            res.redirect.should.be.calledOnce;
            res.redirect.calledWith(301, 'http://localhost/ghost/signup').should.be.true;
            done();
        });
    });

    describe('An API request', function () {
        it('does nothing if there are no capital letters', function (done) {
            req.path = '/ghost/api/v0.1';
            uncapitalise(req, res, next);

            next.should.be.calledOnce;
            done();
        });

        it('redirects to the lower case slug if there are capital letters', function (done) {
            req.path = '/ghost/api/v0.1/ASDfJ';
            req.url = 'http://localhost' + req.path;
            res = {
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            uncapitalise(req, res, next);

            next.should.not.be.called;
            res.redirect.should.be.calledOnce;
            res.redirect.calledWith(301, 'http://localhost/ghost/api/v0.1/asdfj').should.be.true;
            done();
        });
    });

    describe('Any other request', function () {
        it('does nothing if there are no capital letters', function (done) {
            req.path = '/this-is-my-blog-post';
            uncapitalise(req, res, next);

            next.should.be.calledOnce;
            done();
        });

        it('redirects to the lower case slug if there are capital letters', function (done) {
            req.path = '/THis-iS-my-BLOg-poSt';
            req.url = 'http://localhost' + req.path;
            res = {
                redirect: sinon.spy(),
                set: sinon.spy()
            };

            uncapitalise(req, res, next);

            next.should.not.be.called;
            res.redirect.should.be.calledOnce;
            res.redirect.calledWith(301, 'http://localhost/this-is-my-blog-post').should.be.true;
            done();
        });
    });
});
