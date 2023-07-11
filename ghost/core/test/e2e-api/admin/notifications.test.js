const should = require('should');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyEtag, anyLocationFor} = matchers;

const matchNotification = {
    id: anyObjectId
};

describe('Notifications API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('Can add notification', async function () {
        const newNotification = {
            type: 'info',
            message: 'test notification',
            custom: true,
            id: '59a952be7d79ed06b0d21133'
        };

        await agent
            .post('notifications')
            .body({
                notifications: [newNotification]
            })
            .expectStatus(201)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can delete notification', async function () {
        const newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'alert',
            custom: true
        };

        // create the notification to deleted
        const res = await agent
            .post('notifications')
            .body({
                notifications: [newNotification]
            })
            .matchBodySnapshot({
                notifications: [matchNotification]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('notifications')
            });

        const jsonResponse = res.body;

        should.exist(jsonResponse.notifications);
        jsonResponse.notifications.length.should.eql(1);

        jsonResponse.notifications[0].type.should.equal(newNotification.type);
        jsonResponse.notifications[0].message.should.equal(newNotification.message);
        jsonResponse.notifications[0].status.should.equal(newNotification.status);

        const notification = jsonResponse.notifications[0];

        await agent
            .delete(`notifications/${notification.id}/`)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expectStatus(204);

        const res3 = await agent
            .get('notifications')
            .matchBodySnapshot({
                notifications: [matchNotification]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expectStatus(200);

        const deleted = res3.body.notifications.filter(n => n.id === notification.id);
        deleted.should.be.empty();
    });
});
