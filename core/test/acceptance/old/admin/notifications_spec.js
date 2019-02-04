const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../server/config');
const ghost = testUtils.startGhost;
let request;

describe('Notifications API', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    it('Can add notification', function (done) {
        const newNotification = {
            type: 'info',
            message: 'test notification',
            custom: true,
            id: 'customId'
        };

        request.post(localUtils.API.getApiQuery('notifications/'))
            .set('Origin', config.get('url'))
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

    it('Can delete notification', function (done) {
        var newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'alert',
            custom: true
        };

        // create the notification that is to be deleted
        request.post(localUtils.API.getApiQuery('notifications/'))
            .set('Origin', config.get('url'))
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
                localUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');
                jsonResponse.notifications.length.should.eql(1);

                jsonResponse.notifications[0].type.should.equal(newNotification.type);
                jsonResponse.notifications[0].message.should.equal(newNotification.message);
                jsonResponse.notifications[0].status.should.equal(newNotification.status);

                // begin delete test
                request.del(localUtils.API.getApiQuery(`notifications/${jsonResponse.notifications[0].id}/`))
                    .set('Origin', config.get('url'))
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
