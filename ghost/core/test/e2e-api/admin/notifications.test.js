const assert = require('assert/strict');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyEtag, anyLocationFor} = matchers;

const matchNotification = {
    id: anyObjectId
};

describe('Notifications API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
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
        const {body: jsonResponse} = await agent
            .post('notifications')
            .body({
                notifications: [newNotification]
            })
            .expectStatus(201)
            .matchBodySnapshot({
                notifications: [matchNotification]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('notifications')
            });

        const notification = jsonResponse.notifications[0];

        await agent
            .delete(`notifications/${notification.id}/`)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expectStatus(204);

        await agent
            .get('notifications')
            .matchBodySnapshot({
                notifications: [matchNotification]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expectStatus(200)
            .expect(({body}) => {
                const deleted = body.notifications.filter(n => n.id === notification.id);
                assert.equal(deleted.length, 0);
            });
    });

    describe('As Editor', function () {
        before(async function () {
            await agent.loginAsEditor();
        });

        it('Add notification', async function () {
            const newNotification = {
                type: 'info',
                message: 'test notification',
                custom: true
            };

            await agent
                .post('notifications')
                .body({
                    notifications: [newNotification]
                })
                .expectStatus(201)
                .matchBodySnapshot({
                    notifications: [matchNotification]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('notifications')
                });
        });

        it('Read notifications', async function () {
            await agent
                .get('notifications')
                .expectStatus(200)
                .matchBodySnapshot({
                    notifications: new Array(3).fill(matchNotification)
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.equal(body.notifications.length, 3);
                });
        });
    });

    describe('As Author', function () {
        before(async function () {
            await agent.loginAsAuthor();
        });

        it('Add notification', async function () {
            const newNotification = {
                type: 'info',
                message: 'test notification',
                custom: true
            };

            await agent
                .post('notifications')
                .body({
                    notifications: [newNotification]
                })
                .expectStatus(403);
        });

        it('Read notifications', async function () {
            await agent
                .get('notifications')
                .expectStatus(403);
        });
    });

    describe('Can view by multiple users', function () {
        let notification;

        before(async function () {
            // First editor creates a notification
            await agent.loginAsEditor();

            const newNotification = {
                type: 'info',
                message: 'multiple views',
                custom: true
            };

            const {body} = await agent
                .post('notifications')
                .body({
                    notifications: [newNotification]
                })
                .expectStatus(201);

            notification = body.notifications[0];
        });

        it('if one user dismisses a notification, it is still visible to other users', async function () {
            // Editor can see the notification
            await agent
                .get('notifications')
                .expectStatus(200)
                .expect(({body}) => {
                    const matched = body.notifications.filter(n => n.id === notification.id);
                    assert.equal(matched.length, 1);
                });

            // Editor deletes the notification (simulate dismissing)
            await agent
                .delete(`notifications/${notification.id}`)
                .expectEmptyBody()
                .expectStatus(204);

            // Editor now cannot see the notification
            await agent
                .get('notifications')
                .expectStatus(200)
                .expect(({body}) => {
                    const matched = body.notifications.filter(n => n.id === notification.id);
                    assert.equal(matched.length, 0);
                });
        });

        it('second user can dismiss the notification', async function () {
            // Switch to a second user and check the notification is still visible
            await agent.loginAsAdmin();
            await agent
                .get('notifications')
                .expectStatus(200)
                .expect(({body}) => {
                    const matched = body.notifications.filter(n => n.id === notification.id);
                    assert.equal(matched.length, 1);
                });

            // Second user deletes the notification
            await agent
                .delete(`notifications/${notification.id}`)
                .expectEmptyBody()
                .expectStatus(204);

            // Second user now cannot see the notification
            await agent
                .get('notifications')
                .expectStatus(200)
                .expect(({body}) => {
                    const matched = body.notifications.filter(n => n.id === notification.id);
                    assert.equal(matched.length, 0);
                });
        });
    });
});
