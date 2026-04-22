const {agentProvider, fixtureManager, matchers, mockManager, configUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyErrorId, anyEtag, anyISODateTime, anyObjectId, anyString, anyUuid} = matchers;
const models = require('../../../core/server/models');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const settingsCache = require('../../../core/shared/settings-cache');
const {MemberCommenting} = require('../../../core/server/services/members/commenting');

describe('Member Commenting API', function () {
    let agent;
    let member;
    let owner;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
        owner = await fixtureManager.get('users', 0);
    });

    beforeEach(async function () {
        // Create a fresh member for each test
        member = await models.Member.add({
            name: 'Test Member',
            email: `test-${Date.now()}@example.com`,
            email_disabled: false
        });
    });

    afterEach(async function () {
        // Clean up the test member
        if (member) {
            await models.Member.destroy({id: member.id});
        }
    });

    describe('POST /members/:id/commenting/disable', function () {
        it('Can disable commenting with reason only (indefinite)', async function () {
            const {body} = await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Repeated spam comments'
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    members: [{
                        id: anyObjectId,
                        uuid: anyUuid,
                        email: anyString,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime,
                        unsubscribe_url: anyString
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Verify commenting is disabled
            assert.equal(body.members[0].can_comment, false);
            assert.equal(body.members[0].commenting.disabled, true);
            assert.equal(body.members[0].commenting.disabled_reason, 'Repeated spam comments');
            assert.equal(body.members[0].commenting.disabled_until, null);
        });

        it('Can disable commenting with reason and expiry date (temporary)', async function () {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

            const {body} = await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Cooling off period',
                    expires_at: futureDate
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Verify commenting is disabled
            assert.equal(body.members[0].can_comment, false);
            assert.equal(body.members[0].commenting.disabled, true);
            assert.equal(body.members[0].commenting.disabled_reason, 'Cooling off period');
            assert.ok(body.members[0].commenting.disabled_until);
        });

        it('Returns 422 when reason is missing', async function () {
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    expires_at: null
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Returns 422 when expires_at is invalid date format', async function () {
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Test disable',
                    expires_at: 'invalid-date'
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Returns 404 for non-existent member', async function () {
            await agent
                .post('members/aaaaaaaaaaaaaaaaaaaaaaaa/commenting/disable')
                .body({
                    reason: 'Test reason'
                })
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can disable commenting and hide comments with hide_comments: true', async function () {
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Spam behavior',
                    hide_comments: true
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can disable commenting without hiding comments when hide_comments: false', async function () {
            const {body} = await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Warning',
                    hide_comments: false
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            assert.equal(body.members[0].can_comment, false);
            assert.equal(body.members[0].commenting.disabled, true);
        });
    });

    describe('POST /members/:id/commenting/enable', function () {
        it('Can enable commenting for a disabled member', async function () {
            // First disable commenting
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Test disable'
                })
                .expectStatus(200);

            // Then enable
            const {body} = await agent
                .post(`members/${member.id}/commenting/enable`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Verify commenting is enabled
            assert.equal(body.members[0].can_comment, true);
            assert.equal(body.members[0].commenting.disabled, false);
        });

        it('Enabling commenting for a member who can comment works (idempotent)', async function () {
            const {body} = await agent
                .post(`members/${member.id}/commenting/enable`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Member should still be able to comment
            assert.equal(body.members[0].can_comment, true);
            assert.equal(body.members[0].commenting.disabled, false);
        });

        it('Returns 404 for non-existent member', async function () {
            await agent
                .post('members/aaaaaaaaaaaaaaaaaaaaaaaa/commenting/enable')
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Member API responses with commenting data', function () {
        it('New members have can_comment: true by default', async function () {
            const {body} = await agent
                .get(`members/${member.id}`)
                .expectStatus(200);

            assert.equal(body.members[0].can_comment, true);
            assert.equal(body.members[0].commenting.disabled, false);
        });

        it('Members with commenting disabled have can_comment: false', async function () {
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Test disable'
                })
                .expectStatus(200);

            const {body} = await agent
                .get(`members/${member.id}`)
                .expectStatus(200);

            assert.equal(body.members[0].can_comment, false);
            assert.ok(body.members[0].commenting);
            assert.equal(body.members[0].commenting.disabled_reason, 'Test disable');
        });

        it('Members with expired disable have can_comment: true', async function () {
            const pastDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago

            // Directly set an expired disable in the database
            await models.Member.edit({
                commenting: MemberCommenting.disabled('Expired disable', new Date(pastDate))
            }, {id: member.id});

            const {body} = await agent
                .get(`members/${member.id}`)
                .expectStatus(200);

            // Should be able to comment since disable expired
            assert.equal(body.members[0].can_comment, true);
            // But commenting data is still present
            assert.ok(body.members[0].commenting);
            assert.equal(body.members[0].commenting.disabled_reason, 'Expired disable');
        });

        it('Members with future expiry have can_comment: false', async function () {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day from now

            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Temporary disable',
                    expires_at: futureDate
                })
                .expectStatus(200);

            const {body} = await agent
                .get(`members/${member.id}`)
                .expectStatus(200);

            assert.equal(body.members[0].can_comment, false);
            assert.ok(body.members[0].commenting.disabled_until);
        });
    });

    describe('Actions/audit log', function () {
        it('Disable action is logged with the staff member as actor', async function () {
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Spam behavior'
                })
                .expectStatus(200);

            // Query actions for this member, include actor
            const {body} = await agent
                .get(`actions?filter=resource_id:'${member.id}'%2Bresource_type:member&include=actor`)
                .expectStatus(200);

            const editAction = body.actions.find(a => a.event === 'edited');

            assert.ok(editAction);
            assert.deepEqual(editAction.actor, {
                id: owner.id,
                name: owner.name,
                slug: owner.slug,
                image: owner.profile_image
            });
        });

        it('Enable action is logged with the staff member as actor', async function () {
            // First disable commenting
            await agent
                .post(`members/${member.id}/commenting/disable`)
                .body({
                    reason: 'Test disable'
                })
                .expectStatus(200);

            // Then enable
            await agent
                .post(`members/${member.id}/commenting/enable`)
                .expectStatus(200);

            // Query actions for this member, include actor
            const {body} = await agent
                .get(`actions?filter=resource_id:'${member.id}'%2Bresource_type:member&include=actor`)
                .expectStatus(200);

            const editActions = body.actions.filter(a => a.event === 'edited');

            assert.ok(editActions.length >= 2);
            assert.deepEqual(editActions[0].actor, {
                id: owner.id,
                name: owner.name,
                slug: owner.slug,
                image: owner.profile_image
            });
        });
    });
});

describe('Member Commenting Service Behavior', function () {
    let adminAgent;
    let member;

    before(async function () {
        adminAgent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(async function () {
        // Create a fresh member for each test
        member = await models.Member.add({
            name: 'Test Commenter',
            email: `commenter-${Date.now()}@example.com`,
            email_disabled: false
        });
    });

    afterEach(async function () {
        // Clean up the test member
        if (member) {
            await models.Member.destroy({id: member.id});
        }
    });

    it('Member with commenting disabled has can_comment: false', async function () {
        // Disable commenting
        const {body} = await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Spam behavior'})
            .expectStatus(200);

        // Verify via API response (can_comment is computed by service)
        assert.equal(body.members[0].can_comment, false);
    });

    it('Member with expired disable has can_comment: true', async function () {
        const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

        // Set an expired disable directly
        await models.Member.edit({
            commenting: MemberCommenting.disabled('Expired disable', new Date(pastDate))
        }, {id: member.id});

        // Verify via API (can_comment is computed by service)
        const {body} = await adminAgent
            .get(`members/${member.id}`)
            .expectStatus(200);

        assert.equal(body.members[0].can_comment, true);
    });

    it('Member with invalid disabledUntil has can_comment: true (fail open)', async function () {
        // Directly insert invalid date via raw query to bypass API validation
        const knex = require('../../../core/server/data/db').knex;
        await knex('members').where('id', member.id).update({
            commenting: JSON.stringify({
                disabled: true,
                disabledReason: 'Disable with invalid date',
                disabledUntil: 'invalid-garbage-date'
            })
        });

        // Verify via API (fail open - prefer false negatives over false positives)
        const {body} = await adminAgent
            .get(`members/${member.id}`)
            .expectStatus(200);

        assert.equal(body.members[0].can_comment, true);
    });

    it('Member with commenting enabled has can_comment: true again', async function () {
        // Disable commenting
        let response = await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Temporary disable'})
            .expectStatus(200);

        // Verify disabled
        assert.equal(response.body.members[0].can_comment, false);

        // Enable commenting
        response = await adminAgent
            .post(`members/${member.id}/commenting/enable`)
            .expectStatus(200);

        // Verify enabled
        assert.equal(response.body.members[0].can_comment, true);
    });
});

describe('Member with Commenting Disabled - Comment Restriction', function () {
    let adminAgent;
    let membersAgent;
    let member;
    let postId;

    before(async function () {
        adminAgent = await agentProvider.getAdminAPIAgent();
        membersAgent = await agentProvider.getMembersAPIAgent();
        await fixtureManager.init('posts', 'members');
        await adminAgent.loginAsOwner();

        postId = fixtureManager.get('posts', 0).id;
    });

    beforeEach(async function () {
        mockManager.mockMail();

        // Create a fresh member for each test
        member = await models.Member.add({
            name: 'Disabled Test Member',
            email: `disabled-test-${Date.now()}@example.com`,
            email_disabled: false
        });

        // Enable comments
        const getStub = sinon.stub(settingsCache, 'get');
        getStub.callsFake((key, options) => {
            if (key === 'comments_enabled') {
                return 'all';
            }
            return getStub.wrappedMethod.call(settingsCache, key, options);
        });
    });

    afterEach(async function () {
        sinon.restore();
        mockManager.restore();
        await configUtils.restore();

        // Clean up the test member
        if (member) {
            await models.Member.destroy({id: member.id});
        }
    });

    it('Member with commenting disabled cannot post a comment', async function () {
        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Disable commenting via admin API
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Spam behavior'})
            .expectStatus(200);

        // Try to post a comment as the disabled member
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>This comment should be blocked</p>'
            }]})
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Member with commenting disabled cannot reply to a comment', async function () {
        // Create a comment to reply to
        const parentComment = await models.Comment.add({
            post_id: postId,
            member_id: fixtureManager.get('members', 0).id,
            html: '<p>Parent comment</p>'
        });

        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Disable commenting via admin API
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Harassment'})
            .expectStatus(200);

        // Try to reply as the disabled member
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                parent_id: parentComment.id,
                html: '<p>This reply should be blocked</p>'
            }]})
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Member with commenting disabled cannot like a comment', async function () {
        // Create a comment to like
        const comment = await models.Comment.add({
            post_id: postId,
            member_id: fixtureManager.get('members', 0).id,
            html: '<p>A comment to like</p>'
        });

        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Disable commenting via admin API
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Abuse'})
            .expectStatus(200);

        // Try to like as the disabled member
        await membersAgent
            .post(`/api/comments/${comment.id}/like/`)
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Member with commenting disabled cannot edit their own comment', async function () {
        // Log in as the member first
        await membersAgent.loginAs(member.get('email'));

        // Create a comment as the member before disable
        const comment = await models.Comment.add({
            post_id: postId,
            member_id: member.id,
            html: '<p>My original comment</p>'
        });

        // Disable commenting via admin API
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Policy violation'})
            .expectStatus(200);

        // Try to edit the comment as the disabled member
        await membersAgent
            .put(`/api/comments/${comment.id}/`)
            .body({comments: [{
                html: '<p>Trying to edit my comment</p>'
            }]})
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Member with commenting disabled cannot delete their own comment', async function () {
        // Log in as the member first
        await membersAgent.loginAs(member.get('email'));

        // Create a comment as the member before disable
        const comment = await models.Comment.add({
            post_id: postId,
            member_id: member.id,
            html: '<p>My comment to delete</p>'
        });

        // Disable commenting via admin API
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Misconduct'})
            .expectStatus(200);

        // Try to delete the comment as the disabled member
        await membersAgent
            .delete(`/api/comments/${comment.id}/`)
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Member with commenting disabled cannot unlike a comment', async function () {
        // Create a comment to like
        const comment = await models.Comment.add({
            post_id: postId,
            member_id: fixtureManager.get('members', 0).id,
            html: '<p>A comment to like then unlike</p>'
        });

        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Like the comment before disable
        await membersAgent
            .post(`/api/comments/${comment.id}/like/`)
            .expectStatus(204);

        // Disable commenting via admin API
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Abuse'})
            .expectStatus(200);

        // Try to unlike as the disabled member
        await membersAgent
            .delete(`/api/comments/${comment.id}/like/`)
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Member with expired disable can comment', async function () {
        const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Set an expired disable directly in the database
        await models.Member.edit({
            commenting: MemberCommenting.disabled('Expired disable', new Date(pastDate))
        }, {id: member.id});

        // Member should be able to comment since disable is expired
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>This comment should be allowed</p>'
            }]})
            .expectStatus(201);
    });

    it('Disabling with hide_comments hides member comments from the public API', async function () {
        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Post two comments as the member
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>First visible comment</p>'
            }]})
            .expectStatus(201);

        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>Second visible comment</p>'
            }]})
            .expectStatus(201);

        // Verify comments are visible
        const beforeResponse = await membersAgent
            .get(`/api/comments/post/${postId}/`)
            .expectStatus(200);

        const commentsBefore = beforeResponse.body.comments.filter(
            c => c.member?.id === member.id
        );
        assert.equal(commentsBefore.length, 2);

        // Admin disables commenting with hide_comments: true
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({
                reason: 'Spam behavior',
                hide_comments: true
            })
            .expectStatus(200);

        // Verify comments are no longer visible via the public API
        const afterResponse = await membersAgent
            .get(`/api/comments/post/${postId}/`)
            .expectStatus(200);

        const commentsAfter = afterResponse.body.comments.filter(
            c => c.member?.id === member.id
        );
        assert.equal(commentsAfter.length, 0);
    });

    it('Disabling without hide_comments keeps member comments visible', async function () {
        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Post a comment as the member
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>This should stay visible</p>'
            }]})
            .expectStatus(201);

        // Admin disables commenting without hiding
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({
                reason: 'Warning',
                hide_comments: false
            })
            .expectStatus(200);

        // Verify comment is still visible via the public API
        const response = await membersAgent
            .get(`/api/comments/post/${postId}/`)
            .expectStatus(200);

        const memberComments = response.body.comments.filter(
            c => c.member?.id === member.id
        );
        assert.equal(memberComments.length, 1);
    });

    it('Member with commenting re-enabled can comment again', async function () {
        // Log in as the member
        await membersAgent.loginAs(member.get('email'));

        // Disable commenting
        await adminAgent
            .post(`members/${member.id}/commenting/disable`)
            .body({reason: 'Temporary disable'})
            .expectStatus(200);

        // Verify comment is blocked
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>Should be blocked</p>'
            }]})
            .expectStatus(403);

        // Enable commenting
        await adminAgent
            .post(`members/${member.id}/commenting/enable`)
            .expectStatus(200);

        // Now the member should be able to comment
        await membersAgent
            .post('/api/comments/')
            .body({comments: [{
                post_id: postId,
                html: '<p>This comment should now be allowed</p>'
            }]})
            .expectStatus(201);
    });
});
