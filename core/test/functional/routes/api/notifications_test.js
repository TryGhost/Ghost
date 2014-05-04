var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    _             = require('lodash'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request,
    agent;

describe('Notifications API', function () {
   var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;

            request = supertest.agent(app);

            testUtils.clearData()
                .then(function () {
                    return testUtils.initData();
                })
                .then(function () {
                    return testUtils.insertDefaultFixtures();
                })
                .then(function () {
                    request.get('/ghost/signin/')
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                            pattern_meta.should.exist;
                            csrfToken = res.text.match(pattern_meta)[1];

                            setTimeout(function () {
                                request.post('/ghost/signin/')
                                    .set('X-CSRF-Token', csrfToken)
                                    .send({email: user.email, password: user.password})
                                    .expect(200)
                                    .end(function (err, res) {
                                        if (err) {
                                            return done(err);
                                        }

                                        request.saveCookies(res);
                                        request.get('/ghost/')
                                            .expect(200)
                                            .end(function (err, res) {
                                                if (err) {
                                                    return done(err);
                                                }
                                                
                                                csrfToken = res.text.match(pattern_meta)[1];
                                                done();
                                            });
                                    });
                            }, 2000);
                        });
                }, done);
        }).otherwise(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });    

    after(function () {
        httpServer.close();
    });

    describe('Add', function () {
        var newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'persistent',
            id: 'add-test-1'
        };

        it('creates a new notification', function (done) {
            request.post(testUtils.API.getApiQuery('notifications/'))
                .set('X-CSRF-Token', csrfToken)
                .send(newNotification)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    
                    res.headers['location'].should.equal('/ghost/api/v0.1/notifications/' + newNotification.id);

                    var jsonResponse = res.body;

                    testUtils.API.checkResponse(jsonResponse, 'notification');

                    jsonResponse.type.should.equal(newNotification.type);
                    jsonResponse.message.should.equal(newNotification.message);
                    jsonResponse.status.should.equal(newNotification.status);
                    jsonResponse.id.should.equal(newNotification.id);

                    done();
                });
        });
    });

    describe('Delete', function () {
        var newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'persistent',
            id: 'delete-test-1'
        };

        it('deletes a notification', function (done) {
            // create the notification that is to be deleted
            request.post(testUtils.API.getApiQuery('notifications/'))
                .set('X-CSRF-Token', csrfToken)
                .send(newNotification)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    
                    var location = res.headers['location'];
                    location.should.equal('/ghost/api/v0.1/notifications/' + newNotification.id);

                    var jsonResponse = res.body;

                    testUtils.API.checkResponse(jsonResponse, 'notification');

                    jsonResponse.type.should.equal(newNotification.type);
                    jsonResponse.message.should.equal(newNotification.message);
                    jsonResponse.status.should.equal(newNotification.status);
                    jsonResponse.id.should.equal(newNotification.id);

                    // begin delete test
                    request.del(location)
                        .set('X-CSRF-Token', csrfToken)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            // a delete returns a JSON object containing all notifications
                            // so we can make sure the notification we just deleted isn't
                            // included
                            var notifications = res.body;

                            var success;
                            notifications.forEach(function (n) {
                                success = n.id !== newNotification.id;
                            });

                            success.should.be.true;

                            done();
                        });
                });
        });
    });
});
