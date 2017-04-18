var request = require('supertest'),
    should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../test/utils'),
    ghost = require('../../../../../core'),
    labs = require('../../../utils/labs'),
    sandbox = sinon.sandbox.create();

describe('Subscriber: Routing', function () {
    before(testUtils.teardown);
    before(testUtils.setup);
    after(testUtils.teardown);

    before(function (done) {
        ghost().then(function (ghostServer) {
            // Setup the request object with the ghost express app
            request = request(ghostServer.rootApp);

            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
            done(e);
        });
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
                .send({
                    email: 'alphabetazeta',
                    location: 'http://localhost:2368',
                    confirm: ''
                })
                .expect(200)
                .end(function (err, res) {
                    should.not.exist(err);
                    res.text.should.not.containEql('Subscribed!');
                    res.text.should.not.containEql('alphabetazeta');
                    done();
                });
        });

        it('[error] location is not defined', function (done) {
            request.post('/subscribe/')
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
