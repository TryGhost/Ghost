const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyErrorId} = matchers;
const models = require('../../../core/server/models');
const sinon = require('sinon');
const settingsHelpers = require('../../../core/server/services/settings-helpers');
const crypto = require('crypto');

const membersValidationKeyMock = 'abc123dontstealme';

describe('Members Feedback', function () {
    let membersAgent, membersAgent2, memberUuid, memberHmac;
    let clock;

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        membersAgent2 = membersAgent.duplicate();

        await fixtureManager.init('posts', 'members');
        memberUuid = fixtureManager.get('members', 0).uuid;
        memberHmac = crypto.createHmac('sha256', membersValidationKeyMock).update(memberUuid).digest('hex');
    });

    beforeEach(function () {
        sinon.stub(settingsHelpers, 'getMembersValidationKey').returns(membersValidationKeyMock);
        mockManager.mockMail();
    });

    afterEach(async function () {
        clock?.restore();
        clock = undefined;
        await configUtils.restore();
        mockManager.restore();
    });

    describe('Authentication', function () {
        it('Allows authentication via session', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            await membersAgent2.loginAs('authenticationtest@email.com');

            await membersAgent2
                .post('/api/feedback/')
                .body({
                    feedback: [{
                        score: 1,
                        post_id: postId
                    }]
                })
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('feedback')
                })
                .matchBodySnapshot({
                    feedback: [
                        {
                            id: anyObjectId,
                            memberId: anyObjectId,
                            postId: anyObjectId
                        }
                    ]
                });
        });

        it('Allows authentication via uuid (+ key)', async function () {
            const postId = fixtureManager.get('posts', 0).id;

            await membersAgent
                .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
                .body({
                    feedback: [{
                        score: 1,
                        post_id: postId
                    }]
                })
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('feedback')
                })
                .matchBodySnapshot({
                    feedback: [
                        {
                            id: anyObjectId,
                            memberId: anyObjectId,
                            postId: anyObjectId
                        }
                    ]
                });
        });

        it('Throws for missing key', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            await membersAgent
                .post(`/api/feedback/?uuid=${memberUuid}`)
                .body({
                    feedback: [{
                        score: 1,
                        post_id: postId
                    }]
                })
                .expectStatus(401)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });

        it('Thorws for invalid key', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            await membersAgent
                .post(`/api/feedback/?uuid=${memberUuid}&key=1234`)
                .body({
                    feedback: [{
                        score: 1,
                        post_id: postId
                    }]
                })
                .expectStatus(401)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });

        it('Throws for invalid uuid', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            await membersAgent
                .post(`/api/feedback/?uuid=1234`)
                .body({
                    feedback: [{
                        score: 1,
                        post_id: postId
                    }]
                })
                .expectStatus(401)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });

        it('Throws for nonexisting uuid', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            const uuid = '00000000-0000-0000-0000-000000000000';
            await membersAgent
                .post(`/api/feedback/?uuid=${uuid}`)
                .body({
                    feedback: [{
                        score: 1,
                        post_id: postId
                    }]
                })
                .expectStatus(401)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });
    });

    describe('Validation', function () {
        const postId = fixtureManager.get('posts', 0).id;

        it('Throws for invalid score', async function () {
            await membersAgent
                .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
                .body({
                    feedback: [{
                        score: 2,
                        post_id: postId
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });

        it('Throws for invalid score type', async function () {
            await membersAgent
                .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
                .body({
                    feedback: [{
                        score: 'text',
                        post_id: postId
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });

        it('Throws for nonexisting post', async function () {
            await membersAgent
                .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
                .body({
                    feedback: [{
                        score: 1,
                        post_id: '123'
                    }]
                })
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });
    });

    it('Can add positive feedback', async function () {
        const postId = fixtureManager.get('posts', 0).id;

        await membersAgent
            .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
            .body({
                feedback: [{
                    score: 1,
                    post_id: postId
                }]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('feedback')
            })
            .matchBodySnapshot({
                feedback: [
                    {
                        id: anyObjectId,
                        memberId: anyObjectId,
                        postId: anyObjectId
                    }
                ]
            });
    });

    it('Can change existing feedback', async function () {
        clock = sinon.useFakeTimers(new Date());
        const postId = fixtureManager.get('posts', 1).id;

        const {body} = await membersAgent
            .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
            .body({
                feedback: [{
                    score: 0,
                    post_id: postId
                }]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('feedback')
            })
            .matchBodySnapshot({
                feedback: [
                    {
                        id: anyObjectId,
                        memberId: anyObjectId,
                        postId: anyObjectId
                    }
                ]
            });

        assert.equal(body.feedback[0].score, 0);
        const feedbackId = body.feedback[0].id;

        // Fetch real model
        const model1 = await models.MemberFeedback.findOne({id: feedbackId}, {require: true});

        clock.tick(10 * 60 * 1000);

        const {body: body2} = await membersAgent
            .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
            .body({
                feedback: [{
                    score: 1,
                    post_id: postId
                }]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('feedback')
            })
            .matchBodySnapshot({
                feedback: [
                    {
                        id: anyObjectId,
                        memberId: anyObjectId,
                        postId: anyObjectId
                    }
                ]
            });

        assert.equal(body2.feedback[0].id, feedbackId);
        assert.equal(body2.feedback[0].score, 1);
        const model2 = await models.MemberFeedback.findOne({id: feedbackId}, {require: true});

        assert.notEqual(model2.get('updated_at').getTime(), model1.get('updated_at').getTime());

        clock.tick(10 * 60 * 1000);

        // Do the same change again, and the model shouldn't change
        const {body: body3} = await membersAgent
            .post(`/api/feedback/?uuid=${memberUuid}&key=${memberHmac}`)
            .body({
                feedback: [{
                    score: 1,
                    post_id: postId
                }]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('feedback')
            })
            .matchBodySnapshot({
                feedback: [
                    {
                        id: anyObjectId,
                        memberId: anyObjectId,
                        postId: anyObjectId
                    }
                ]
            });

        const model3 = await models.MemberFeedback.findOne({id: feedbackId}, {require: true});
        assert.equal(body3.feedback[0].id, feedbackId);
        assert.equal(body3.feedback[0].score, 1);
        assert.equal(model3.get('updated_at').getTime(), model2.get('updated_at').getTime());
    });
});
