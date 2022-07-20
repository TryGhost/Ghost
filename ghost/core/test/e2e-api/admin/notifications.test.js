const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

describe('Notifications API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('Can add notification', async function () {
        const newNotification = {
            type: 'info',
            message: 'test notification',
            custom: true,
            id: 'customId'
        };

        const res = await request.post(localUtils.API.getApiQuery('notifications/'))
            .set('Origin', config.get('url'))
            .send({notifications: [newNotification]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const jsonResponse = res.body;

        should.exist(jsonResponse.notifications);

        localUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

        jsonResponse.notifications[0].type.should.equal(newNotification.type);
        jsonResponse.notifications[0].message.should.equal(newNotification.message);
        jsonResponse.notifications[0].status.should.equal('alert');
        jsonResponse.notifications[0].dismissible.should.be.true();
        should.exist(jsonResponse.notifications[0].location);
        jsonResponse.notifications[0].location.should.equal('bottom');
        jsonResponse.notifications[0].id.should.be.a.String();

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('notifications/')}${res.body.notifications[0].id}/`);
    });

    it('Can delete notification', async function () {
        const newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'alert',
            custom: true
        };

        // create the notification that is to be deleted
        const res = await request.post(localUtils.API.getApiQuery('notifications/'))
            .set('Origin', config.get('url'))
            .send({notifications: [newNotification]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const jsonResponse = res.body;

        should.exist(jsonResponse.notifications);
        localUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');
        jsonResponse.notifications.length.should.eql(1);

        jsonResponse.notifications[0].type.should.equal(newNotification.type);
        jsonResponse.notifications[0].message.should.equal(newNotification.message);
        jsonResponse.notifications[0].status.should.equal(newNotification.status);

        const notification = jsonResponse.notifications[0];

        const res2 = await request.del(localUtils.API.getApiQuery(`notifications/${notification.id}/`))
            .set('Origin', config.get('url'))
            .expect(204);
        res2.body.should.be.empty();

        const res3 = await request.get(localUtils.API.getApiQuery(`notifications/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const deleted = res3.body.notifications.filter(n => n.id === notification.id);
        deleted.should.be.empty();
    });
});
