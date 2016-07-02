var mail = require('../../../server/mail'),
    errors = require('../../../server/errors'),
    mailgun = require('mailgun-js'),
    lodash = require('lodash'),
    moment = require('moment'),
    /*jshint unused:false*/
    should = require('should'),
    fs = require('fs'),
    sinon = require('sinon'),
    sandbox = sinon.sandbox.create();

describe('Mail: GhostMailgun', function () {
    var scope = {template: null, tag: 'custom-blog-2016-05-01'};

    before(function (done) {
        mail.utils.generateContent({
            template: 'welcome',
            data: {
                ownerEmail: 'Kate'
            }
        }).then(function (template) {
            scope.template = template;
            done();
        });
    });

    beforeEach(function () {
        scope.ghostMailgun = new mail.GhostMailgun({
            apiKey: 'some-api-key',
            domain: 'testemail.ghost.org'
        });

        sandbox.stub(scope.ghostMailgun.client, 'messages', function () {
            return {
                send: function (options, done) {
                    done(null, {id: 'mailgun-id'});
                }
            }
        });

        sandbox.stub(scope.ghostMailgun.client, 'get', function (endpoint, options, done) {
            if (endpoint.match(/events/)) {
                return done(null, {items: [{tags: ['custom-blog-2016-05-01'], recipient: 'kate@ghost.org'}]});
            }

            done(null, {stats: [{time: new Date(), delivered: 10, clicked: 1}]});
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('success', function () {
        it('send', function (done) {
            scope.ghostMailgun.send({
                from: 'Katharina Irrgang <katharina@my-fancy-blog.de>',
                to: [{email: 'katharina.irrgang@gmail.com', id: 1}, {email: 'kate@ghost.org', id: 2}],
                html: '<h1>email</h1>',
                tag: scope.tag
            }, function (err, response) {
                if (err) {
                    return done(err);
                }

                scope.ghostMailgun.client.messages.calledOnce.should.eql(true);
                should.exist(response.ids);
                response.ids.length.should.eql(1);
                done();
            });
        });

        it('send: send to over 1k recipients', function (done) {
            var recipients = [];

            lodash.each(lodash.range(1001), function () {
                recipients.push({email: 'katharina.irrgang@gmail.com', id: 1});
            });

            scope.ghostMailgun.send({
                from: 'Katharina Irrgang <katharina@my-fancy-blog.de>',
                to: recipients,
                html: '<h1>email</h1>',
                tag: scope.tag
            }, function (err, response) {
                if (err) {
                    return done(err);
                }

                scope.ghostMailgun.client.messages.callCount.should.eql(3);
                should.exist(response.ids);
                response.ids.length.should.eql(3);
                done();
            });
        });

        it('get tracking stats', function (done) {
            scope.ghostMailgun.fetchStats({
                tag: scope.tag
            }, function (err, res) {
                if (err) {
                    return done(err);
                }

                res.length.should.eql(1);
                res[0].delivered.should.eql(10);
                res[0].clicked.should.eql(1);
                done();
            });
        });

        it('get tracking events', function (done) {
            scope.ghostMailgun.fetchEvents({
                tag: scope.tag
            }, function (err, res) {
                if (err) {
                    return done(err);
                }

                res.length.should.eql(1);
                done();
            });
        });
    });

    describe('error', function () {
        it('send: to is not in the right format', function (done) {
            scope.ghostMailgun.send({
                from: 'Katharina von der Baumschule <kate@baumschule.de>',
                to: ['katharina.irrgang@gmail.com'],
                html: '<h1>email</h1>'
            }, function (err) {
                should.exist(err);
                (err instanceof errors.ValidationError).should.eql(true);
                done();
            });
        });
    });
});
