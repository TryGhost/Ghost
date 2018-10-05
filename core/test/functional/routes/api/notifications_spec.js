var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    localUtils = require('./utils'),
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
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    describe('Add', function () {
        it('creates a new notification and sets default fields', function (done) {
            const newNotification = {
                type: 'info',
                message: 'test notification',
                custom: true
            };

            request.post(localUtils.API.getApiQuery('notifications/'))
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
                    jsonResponse.notifications[0].dismissible.should.be.true();
                    should.exist(jsonResponse.notifications[0].location);
                    jsonResponse.notifications[0].location.should.equal('bottom');
                    jsonResponse.notifications[0].id.should.be.a.String();

                    done();
                });
        });

        it('creates duplicate', function (done) {
            const newNotification = {
                type: 'info',
                message: 'add twice',
                custom: true,
                id: 'customId-2'
            };

            request.post(localUtils.API.getApiQuery('notifications/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({notifications: [newNotification]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.notifications);
                    jsonResponse.notifications.should.be.an.Array().with.lengthOf(1);
                    jsonResponse.notifications[0].message.should.equal(newNotification.message);

                    request.post(localUtils.API.getApiQuery('notifications/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send({notifications: [newNotification]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            const jsonResponse = res.body;
                            should.exist(jsonResponse.notifications);
                            jsonResponse.notifications.should.be.an.Array().with.lengthOf(0);

                            done();
                        });
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
            request.post(localUtils.API.getApiQuery('notifications/'))
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
