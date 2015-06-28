/*globals describe, beforeEach, it*/
/*jshint expr:true*/
var should          = require('should'),
    sinon           = require('sinon'),

    middleware      = require('../../../server/middleware').middleware;

describe('Middleware: Client Auth', function () {
    var req, res, next;

    beforeEach(function () {
        req = {};
        res = {};
        next = sinon.spy();
    });

    describe('addClientSecret', function () {
        it('sets a `client_secret` if not part of body', function () {
            var requestBody = {};

            req.body = requestBody;

            middleware.api.addClientSecret(req, res, next);

            next.called.should.be.true;
            should(req.body).have.property('client_secret');
            req.body.client_secret.should.not.be.empty;
        });

        it('does not tamper with `client_secret` if already present', function () {
            var requestBody = {
                client_secret: 'keep-it-safe-keep-it-secret'
            };

            req.body = requestBody;

            middleware.api.addClientSecret(req, res, next);

            next.called.should.be.true;
            should(req.body).have.property('client_secret');
            req.body.client_secret.should.equal('keep-it-safe-keep-it-secret');
        });
    });
});
