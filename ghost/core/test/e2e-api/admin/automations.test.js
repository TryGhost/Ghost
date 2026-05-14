const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const ObjectId = require('bson-objectid').default;
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const automationsApi = require('../../../core/server/services/automations/automations-api');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartAutomationsPollEvent = require('../../../core/server/services/automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag, anyErrorId, anyISODateTime, anyObjectId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

const matchAutomationSummary = () => ({
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
});

const matchAutomation = () => ({
    ...matchAutomationSummary(),
    actions: [{
        id: anyObjectId
    }, {
        id: anyObjectId,
        data: {
            email_design_setting_id: anyObjectId
        }
    }, {
        id: anyObjectId
    }, {
        id: anyObjectId,
        data: {
            email_design_setting_id: anyObjectId
        }
    }],
    edges: Array.from({length: 3}, () => ({
        source_action_id: anyObjectId,
        target_action_id: anyObjectId
    }))
});

const matchPagination = () => ({
    page: 1,
    pages: 1,
    limit: 'all',
    total: 2,
    prev: null,
    next: null
});

const buildWaitAction = () => ({
    id: ObjectId().toHexString(),
    type: 'wait',
    data: {
        wait_hours: 24
    }
});

const buildLinearEdges = actions => actions.slice(1).map((action, index) => ({
    source_action_id: actions[index].id,
    target_action_id: action.id
}));

describe('Automations API', function () {
    let agent;
    let schedulerIntegration;
    let schedulerToken;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'integrations', 'api_keys');
        await agent.loginAsOwner();

        schedulerIntegration = await models.Integration.findOne(
            {slug: 'ghost-scheduler'},
            {withRelated: 'api_keys'}
        );

        schedulerToken = getSignedAdminToken({
            publishedAt: new Date().toISOString(),
            apiUrl: '/admin/',
            integration: schedulerIntegration.toJSON()
        });
    });

    afterEach(function () {
        sinon.restore();
        automationsApi._resetTestDatabase();
    });

    describe('browse', function () {
        it('returns automations sourced from the temporary fake database', async function () {
            await agent
                .get('automations')
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet())
                .matchBodySnapshot({
                    automations: [
                        matchAutomationSummary(),
                        matchAutomationSummary()
                    ],
                    meta: {
                        pagination: matchPagination()
                    }
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('read', function () {
        it('returns the automation, ordered actions, and edges sourced from the temporary fake database', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            await agent
                .get(`automations/${browseBody.automations[0].id}`)
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet())
                .matchBodySnapshot({
                    automations: [matchAutomation()]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('edit', function () {
        it('replaces automation actions and edges using frontend-generated ObjectIds', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const waitActionId = ObjectId().toHexString();
            const emailActionId = ObjectId().toHexString();
            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);
            const emailLexical = JSON.stringify({
                root: {
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const {body: editBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [{
                            id: waitActionId,
                            type: 'wait',
                            data: {
                                wait_hours: 24
                            }
                        }, {
                            id: emailActionId,
                            type: 'send_email',
                            data: {
                                email_subject: 'Hello from the editor',
                                email_lexical: emailLexical,
                                email_sender_name: null,
                                email_sender_email: null,
                                email_sender_reply_to: null,
                                email_design_setting_id: '64b6f7b7c8f1a2b3c4d5e6f7'
                            }
                        }],
                        edges: [{
                            source_action_id: waitActionId,
                            target_action_id: emailActionId
                        }]
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            const automation = editBody.automations[0];
            assert.equal(automation.name, beforeBody.automations[0].name);
            assert.equal(automation.status, 'inactive');
            assert.equal(automation.actions.length, 2);
            assert.equal(automation.edges.length, 1);
            assert.equal(automation.actions[0].id, waitActionId);
            assert.equal(automation.actions[1].id, emailActionId);
            assert.equal(automation.actions[0].type, 'wait');
            assert.equal(automation.actions[0].data.wait_hours, 24);
            assert.equal(automation.actions[1].type, 'send_email');
            assert.equal(automation.actions[1].data.email_subject, 'Hello from the editor');
            assert.equal(automation.edges[0].source_action_id, automation.actions[0].id);
            assert.equal(automation.edges[0].target_action_id, automation.actions[1].id);

            const {body: readBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(readBody.automations[0], automation);
        });

        it('allows an automation with a single action and no edges', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const actionId = ObjectId().toHexString();

            const {body: editBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [{
                            id: actionId,
                            type: 'wait',
                            data: {
                                wait_hours: 24
                            }
                        }],
                        edges: []
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            const automation = editBody.automations[0];
            assert.equal(automation.status, 'inactive');
            assert.deepEqual(automation.actions, [{
                id: actionId,
                type: 'wait',
                data: {
                    wait_hours: 24
                }
            }]);
            assert.deepEqual(automation.edges, []);

            const {body: readBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(readBody.automations[0], automation);
        });

        it('allows an automation with 20 actions', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const actions = Array.from({length: 20}, buildWaitAction);
            const edges = buildLinearEdges(actions);

            const {body: editBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions,
                        edges
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            const automation = editBody.automations[0];
            assert.equal(automation.status, 'inactive');
            assert.equal(automation.actions.length, 20);
            assert.equal(automation.edges.length, 19);
            assert.deepEqual(automation.actions, actions);
            assert.deepEqual(automation.edges, edges);
        });

        it('rejects an automation with more than 20 actions', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const actions = Array.from({length: 21}, buildWaitAction);

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions,
                        edges: buildLinearEdges(actions)
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects an invalid automation status', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const {body: readBody} = await agent
                .get(`automations/${browseBody.automations[0].id}`)
                .expectStatus(200);

            await agent
                .put(`automations/${browseBody.automations[0].id}`)
                .body({
                    automations: [{
                        status: 'paused',
                        actions: readBody.automations[0].actions,
                        edges: readBody.automations[0].edges
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());
        });

        it('rejects an empty edit payload', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            await agent
                .put(`automations/${browseBody.automations[0].id}`)
                .body({
                    automations: [{
                        actions: null
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());
        });

        it('rejects an edit with no actions or edges', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [],
                        edges: []
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects an action with an invalid type', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const {body: errorBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [{
                            id: ObjectId().toHexString(),
                            type: 'sms',
                            data: {}
                        }],
                        edges: []
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            assert.match(errorBody.errors[0].context, /actions\.0\.type/);

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects changing an existing action type', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const existingAction = beforeBody.automations[0].actions[0];
            const changedAction = existingAction.type === 'wait' ? {
                id: existingAction.id,
                type: 'send_email',
                data: {
                    email_subject: 'Changed type',
                    email_lexical: JSON.stringify({root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}}),
                    email_sender_name: null,
                    email_sender_email: null,
                    email_sender_reply_to: null,
                    email_design_setting_id: '64b6f7b7c8f1a2b3c4d5e6f7'
                }
            } : {
                id: existingAction.id,
                type: 'wait',
                data: {
                    wait_hours: 24
                }
            };

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: beforeBody.automations[0].actions.map((action) => {
                            return action.id === existingAction.id ? changedAction : action;
                        }),
                        edges: beforeBody.automations[0].edges
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects an action from another automation', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const foreignAutomationId = browseBody.automations[1].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const {body: foreignBody} = await agent
                .get(`automations/${foreignAutomationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const foreignAction = foreignBody.automations[0].actions[0];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction, foreignAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: foreignAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects an edge that references another automation', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const foreignAutomationId = browseBody.automations[1].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const {body: foreignBody} = await agent
                .get(`automations/${foreignAutomationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const foreignAction = foreignBody.automations[0].actions[0];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: foreignAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects an edge that references a missing action', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: ObjectId().toHexString()
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects an edge that references a soft-deleted action', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[1].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const keptAction = beforeBody.automations[0].actions[0];
            const deletedAction = beforeBody.automations[0].actions[1];

            const {body: editedBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [keptAction],
                        edges: []
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            const editedAutomation = editedBody.automations[0];
            assert.equal(editedAutomation.actions.length, 1);
            assert.equal(editedAutomation.actions[0].id, keptAction.id);

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: editedAutomation.actions,
                        edges: [{
                            source_action_id: keptAction.id,
                            target_action_id: deletedAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody.automations[0], editedAutomation);
        });

        it('rejects an orphaned action', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const secondAction = beforeBody.automations[0].actions[1];
            const orphanedAction = beforeBody.automations[0].actions[2];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction, secondAction, orphanedAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: secondAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects a graph with multiple heads', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const secondAction = beforeBody.automations[0].actions[1];
            const thirdAction = beforeBody.automations[0].actions[2];
            const fourthAction = beforeBody.automations[0].actions[3];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction, secondAction, thirdAction, fourthAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: secondAction.id
                        }, {
                            source_action_id: thirdAction.id,
                            target_action_id: fourthAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects a branching graph', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const secondAction = beforeBody.automations[0].actions[1];
            const thirdAction = beforeBody.automations[0].actions[2];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction, secondAction, thirdAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: secondAction.id
                        }, {
                            source_action_id: firstAction.id,
                            target_action_id: thirdAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects a graph with converging edges', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const secondAction = beforeBody.automations[0].actions[1];
            const thirdAction = beforeBody.automations[0].actions[2];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction, secondAction, thirdAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: thirdAction.id
                        }, {
                            source_action_id: secondAction.id,
                            target_action_id: thirdAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });

        it('rejects a circular graph', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: beforeBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            const firstAction = beforeBody.automations[0].actions[0];
            const secondAction = beforeBody.automations[0].actions[1];
            const thirdAction = beforeBody.automations[0].actions[2];

            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [firstAction, secondAction, thirdAction],
                        edges: [{
                            source_action_id: firstAction.id,
                            target_action_id: secondAction.id
                        }, {
                            source_action_id: secondAction.id,
                            target_action_id: thirdAction.id
                        }, {
                            source_action_id: thirdAction.id,
                            target_action_id: firstAction.id
                        }]
                    }]
                })
                .expectStatus(422)
                .expect(cacheInvalidateHeaderNotSet());

            const {body: afterBody} = await agent
                .get(`automations/${automationId}`)
                .expectStatus(200);

            assert.deepEqual(afterBody, beforeBody);
        });
    });

    describe('poll', function () {
        /** @type {sinon.SinonStub} */
        let dispatchStub;

        beforeEach(function () {
            dispatchStub = sinon.stub(domainEvents, 'dispatch');
        });

        it('does not poll when request lacks a token', async function () {
            await agent
                .put('automations/poll/')
                .expectStatus(401)
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        message: 'Invalid token: No token found in URL'
                    }]
                });

            sinon.assert.notCalled(dispatchStub);
        });

        it('does not poll when request token is invalid', async function () {
            const invalidSchedulerToken = getSignedAdminToken({
                publishedAt: new Date().toISOString(),
                apiUrl: '/members/',
                integration: schedulerIntegration.toJSON()
            });

            await agent
                .put(`automations/poll/?token=${invalidSchedulerToken}`)
                .expectStatus(401)
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });

            sinon.assert.notCalled(dispatchStub);
        });

        it('triggers a poll with a valid scheduler integration token', async function () {
            await agent
                .put(`automations/poll/?token=${schedulerToken}`)
                .expectStatus(204)
                .expectEmptyBody()
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            sinon.assert.calledOnceWithExactly(dispatchStub, sinon.match.instanceOf(StartAutomationsPollEvent));
        });
    });
});
