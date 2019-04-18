const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const config = require('../../../../../server/config');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;

describe('Notifications API', function () {
    describe('As Editor', function () {
        let request;

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({
                            email: 'test+editor@ghost.org'
                        }),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then((user) => {
                    request.user = user;
                    return localUtils.doAuth(request);
                });
        });

        it('Add notification', function () {
            const newNotification = {
                type: 'info',
                message: 'test notification',
                custom: true
            };

            return request.post(localUtils.API.getApiQuery('notifications/'))
                .set('Origin', config.get('url'))
                .send({notifications: [newNotification]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.notifications);
                    should.equal(jsonResponse.notifications.length, 1);
                });
        });

        it('Read notifications', function () {
            return request.get(localUtils.API.getApiQuery('notifications/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.notifications);
                    should.equal(jsonResponse.notifications.length, 1);
                });
        });
    });

    describe('As Author', function () {
        let request;

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({
                            email: 'test+author@ghost.org'
                        }),
                        role: testUtils.DataGenerator.Content.roles[2].name
                    });
                })
                .then((user) => {
                    request.user = user;
                    return localUtils.doAuth(request);
                });
        });

        it('Add notification', function () {
            const newNotification = {
                type: 'info',
                message: 'test notification',
                custom: true
            };

            return request.post(localUtils.API.getApiQuery('notifications/'))
                .set('Origin', config.get('url'))
                .send({notifications: [newNotification]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });

        it('Read notifications', function () {
            return request.get(localUtils.API.getApiQuery('notifications/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });
    });

    describe('Can view by multiple users', function () {
        let requestEditor1;
        let requestEditor2;
        let notification;

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    requestEditor1 = supertest.agent(config.get('url'));
                    requestEditor2 = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({
                            email: 'test+editor1@ghost.org'
                        }),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then((user) => {
                    requestEditor1.user = user;
                    return localUtils.doAuth(requestEditor1);
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({
                            email: 'test+editor2@ghost.org'
                        }),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then((user) => {
                    requestEditor2.user = user;
                    return localUtils.doAuth(requestEditor2);
                })
                .then(() => {
                    const newNotification = {
                        type: 'info',
                        message: 'multiple views',
                        custom: true
                    };

                    return requestEditor1.post(localUtils.API.getApiQuery('notifications/'))
                        .set('Origin', config.get('url'))
                        .send({notifications: [newNotification]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(201)
                        .then((res) => {
                            notification = res.body.notifications[0];
                        });
                });
        });

        it('notification is visible and dismissible by other user', function () {
            return requestEditor1.del(localUtils.API.getApiQuery(`notifications/${notification.id}`))
                .set('Origin', config.get('url'))
                .expect(204)
                .then(() => {
                    return requestEditor2.get(localUtils.API.getApiQuery(`notifications/`))
                        .set('Origin', config.get('url'))
                        .expect(200)
                        .then(function (res) {
                            const deleted = res.body.notifications.filter(n => n.id === notification.id);
                            deleted.should.not.be.empty();
                        });
                })
                .then(() => {
                    return requestEditor2.del(localUtils.API.getApiQuery(`notifications/${notification.id}`))
                        .set('Origin', config.get('url'))
                        .expect(204);
                })
                .then(() => {
                    return requestEditor2.get(localUtils.API.getApiQuery(`notifications/`))
                        .set('Origin', config.get('url'))
                        .expect(200)
                        .then(function (res) {
                            const deleted = res.body.notifications.filter(n => n.id === notification.id);
                            deleted.should.be.empty();
                        });
                });
        });
    });
});
