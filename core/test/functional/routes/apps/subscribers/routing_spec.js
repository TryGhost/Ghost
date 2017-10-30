var supertest = require('supertest'),
    should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    labs = require('../../../../../server/utils/labs'),
    config = require('../../../../../server/config'),
    ghost = testUtils.startGhost,
    sandbox = sinon.sandbox.create();

describe('Subscriber: Routing', function () {
    var ghostServer, request;

    before(function (done) {
        ghost().then(function (_ghostServer) {
            ghostServer = _ghostServer;
            return ghostServer.start();
        }).then(function () {
            request = supertest.agent(config.get('url'));
            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
            done(e);
        });
    });

    after(function () {
        return ghostServer.stop();
    });

    before(function () {
        sandbox.stub(labs, 'isSet', function (key) {
            if (key === 'subscribers') {
                return true;
            }
        });
    });

    after(function () {
        sandbox.restore();
    });

    describe('GET', function () {
        it('[success]', function (done) {
            request.get('/subscribe/')
                .expect(200)
                .end(function (err) {
                    should.not.exist(err);
                    done();
                });
        });
    });

    describe('POST', function () {
        it('[success]', function (done) {
            request.post('/subscribe/')
                .set('Content-type', 'application/x-www-form-urlencoded')
                .send({
                    email: 'test@ghost.org',
                    location: 'http://localhost:2368',
                    confirm: ''
                })
                .expect(200)
                .end(function (err, res) {
                    should.not.exist(err);
                    res.text.should.containEql('Subscribed!');
                    res.text.should.containEql('test@ghost.org');
                    done();
                });
        });

        it('[error] email is invalid', function (done) {
            request.post('/subscribe/')
                .set('Content-type', 'application/x-www-form-urlencoded')
                .send({
                    email: 'alphabetazeta',
                    location: 'http://localhost:2368',
                    confirm: ''
                })
                .expect(200)
                .end(function (err, res) {
                    should.not.exist(err);
                    res.text.should.containEql('http://localhost:2368');
                    res.text.should.not.containEql('Subscribed!');
                    res.text.should.not.containEql('alphabetazeta');
                    done();
                });
        });

        it('[error] location is not defined', function (done) {
            request.post('/subscribe/')
                .set('Content-type', 'application/x-www-form-urlencoded')
                .send({
                    email: 'test@ghost.org',
                    confirm: ''
                })
                .expect(200)
                .end(function (err, res) {
                    should.not.exist(err);
                    res.text.should.not.containEql('Subscribed!');
                    res.text.should.not.containEql('test@ghost.org');
                    done();
                });
        });

        it('[error] confirm is not defined', function (done) {
            request.post('/subscribe/')
                .set('Content-type', 'application/x-www-form-urlencoded')
                .send({
                    email: 'test@ghost.org',
                    location: 'http://localhost:2368'
                })
                .expect(200)
                .end(function (err, res) {
                    should.not.exist(err);
                    res.text.should.not.containEql('Subscribed!');
                    res.text.should.not.containEql('test@ghost.org');
                    done();
                });
        });
    });
});
