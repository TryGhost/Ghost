var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Notifications API', function () {
    var accesstoken = '', ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    describe('Add', function () {
        var newNotification = {
            type: 'info',
            message: 'test notification',
            custom: true
        };

        it('creates a new notification', function (done) {
            request.post(testUtils.API.getApiQuery('notifications/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({notifications: [newNotification]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;

                    should.exist(jsonResponse.notifications);

                    testUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

                    jsonResponse.notifications[0].type.should.equal(newNotification.type);
                    jsonResponse.notifications[0].message.should.equal(newNotification.message);
                    jsonResponse.notifications[0].status.should.equal('alert');

                    done();
                });
        });
    });

    describe('Delete', function () {
        var newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'alert',
            custom: true
        };

        it('deletes a notification', function (done) {
            // create the notification that is to be deleted
            request.post(testUtils.API.getApiQuery('notifications/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({notifications: [newNotification]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var location = res.headers.location,
                        jsonResponse = res.body;

                    should.exist(jsonResponse.notifications);
                    testUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

                    jsonResponse.notifications[0].type.should.equal(newNotification.type);
                    jsonResponse.notifications[0].message.should.equal(newNotification.message);
                    jsonResponse.notifications[0].status.should.equal(newNotification.status);

                    // begin delete test
                    request.del(location)
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect(204)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            res.body.should.be.empty();

                            done();
                        });
                });
        });
    });
});
