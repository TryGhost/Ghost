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
                custom: true,
                id: 'customId'
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

                    localUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

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

        it('should have correct order', function () {
            const firstNotification = {
                status: 'alert',
                type: 'info',
                custom: true,
                id: 'firstId',
                dismissible: true,
                message: '1'
            };

            const secondNotification = {
                status: 'alert',
                type: 'info',
                custom: true,
                id: 'secondId',
                dismissible: true,
                message: '2'
            };

            return request.post(localUtils.API.getApiQuery('notifications/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({notifications: [firstNotification]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then(() => {
                    return request.post(localUtils.API.getApiQuery('notifications/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send({notifications: [secondNotification]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(201);
                })
                .then(() => {
                    return request.get(localUtils.API.getApiQuery('notifications/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then(res => {
                            const jsonResponse = res.body;

                            jsonResponse.notifications.should.be.an.Array().with.lengthOf(4);
                            jsonResponse.notifications[0].id.should.equal(secondNotification.id);
                            jsonResponse.notifications[1].id.should.equal(firstNotification.id);
                            jsonResponse.notifications[2].id.should.equal('customId-2');
                            jsonResponse.notifications[3].id.should.equal('customId');
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
                    localUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

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

        it('returns 404 when removing notification with unknown id', function () {
            return request.del(localUtils.API.getApiQuery('notifications/unknown'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .then(res => {
                    res.body.errors[0].message.should.equal('Notification does not exist.');
                });
        });
    });
});
