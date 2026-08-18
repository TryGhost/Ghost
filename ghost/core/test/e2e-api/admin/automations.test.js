const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const ObjectId = require('bson-objectid').default;
const models = require('../../../core/server/models');
const labs = require('../../../core/shared/labs');
const mailService = require('../../../core/server/services/mail');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');
const {agentProvider, dbUtils, fixtureManager, matchers, assertions, resetRateLimits} = require('../../utils/e2e-framework');
const {cleanupAutomationsFixture, EMPTY_EMAIL_LEXICAL, NON_EMPTY_EMAIL_LEXICAL, setupAutomationsFixture, upsertEmailDesignSetting, TEST_EMAIL_DESIGN_SETTING_ID} = require('../../utils/automations-fixtures');
const StartAutomationsPollEvent = require('../../../core/server/services/automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag, anyErrorId, anyISODateTime, anyObjectId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;
const hashRedirectDestination = url => createHash('sha256').update(url).digest();

const matchAutomationBase = () => ({
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
});

const matchAutomationSummary = () => ({
    ...matchAutomationBase(),
    stats: {
        last_run_created_at: null,
        total_run_count: 0,
        in_progress_run_count: 0
    }
});

const matchAutomation = () => ({
    ...matchAutomationBase(),
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

const buildSendEmailAction = (dataOverrides = {}) => ({
    id: ObjectId().toHexString(),
    type: 'send_email',
    data: {
        email_subject: 'Welcome',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: TEST_EMAIL_DESIGN_SETTING_ID,
        ...dataOverrides
    }
});

describe('Automations API', function () {
    let agent;
    let membersAgent;
    let schedulerKey;
    let schedulerToken;

    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        agent = agents.adminAgent;
        membersAgent = agents.membersAgent;
        await fixtureManager.init('users', 'integrations', 'api_keys', 'members');
        await agent.loginAsOwner();

        schedulerKey = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');

        schedulerToken = getSignedAdminToken({
            publishedAt: new Date().toISOString(),
            apiUrl: '/admin/',
            key: schedulerKey
        });
    });

    beforeEach(async function () {
        await setupAutomationsFixture();
    });

    afterEach(async function () {
        sinon.restore();
        await cleanupAutomationsFixture();
    });

    describe('browse', function () {
        function enableAutomationsLabsFlag() {
            const labsStub = sinon.stub(labs, 'isSet');
            labsStub.callThrough();
            labsStub.withArgs('automations').returns(true);
        }

        async function signUpMember(email) {
            await dbUtils.truncate('brute');
            await resetRateLimits();

            const mailStub = sinon.stub(mailService.GhostMailer.prototype, 'sendMail').resolves('Mail sent');
            try {
                const {text: integrityToken} = await membersAgent.get('/api/integrity-token/').expectStatus(200);
                await membersAgent.post('/api/send-magic-link')
                    .body({email, emailType: 'signup', integrityToken})
                    .expectStatus(201);

                const magicLinkMail = mailStub.getCalls()
                    .map(call => call.args[0])
                    .find(mail => mail.to === email);
                const [magicLinkUrl] = magicLinkMail.text.match(/https?:\/\/\S+/);
                const {searchParams} = new URL(magicLinkUrl);

                await membersAgent
                    .get(`/?token=${searchParams.get('token')}&action=signup`)
                    .expectStatus(302)
                    .expectHeader('Location', /success=true/);

                await domainEvents.allSettled();
            } finally {
                mailStub.restore();
            }
        }

        // Signing up enqueues the automation run after the member creation
        // transaction commits, so the run isn't guaranteed to exist by the time
        // the signup request completes.
        async function waitForTotalRunCount(automationId, totalRunCount) {
            let automation;
            for (let attempt = 0; attempt < 50; attempt++) {
                const {body} = await agent.get('automations').expectStatus(200);
                automation = body.automations.find(candidate => candidate.id === automationId);
                if (automation.stats.total_run_count === totalRunCount) {
                    return automation;
                }
                await new Promise((resolve) => {
                    setTimeout(resolve, 100);
                });
            }
            throw new Error(`Timed out waiting for automation ${automationId} to reach ${totalRunCount} runs (currently ${automation.stats.total_run_count})`);
        }

        async function createWelcomeEmailsForAutomations(automations) {
            await models.Base.knex('welcome_email_automated_emails').insert(automations.map(automation => ({
                id: ObjectId().toHexString(),
                welcome_email_automation_id: automation.id,
                next_welcome_email_automated_email_id: null,
                delay_days: 0,
                subject: `${automation.slug} subject`,
                lexical: NON_EMPTY_EMAIL_LEXICAL,
                email_design_setting_id: TEST_EMAIL_DESIGN_SETTING_ID,
                created_at: new Date(),
                updated_at: new Date()
            })));
        }

        async function assertWelcomeEmailActionsWereCreated(automations) {
            for (const automation of automations) {
                const {body} = await agent
                    .get(`automations/${automation.id}`)
                    .expectStatus(200);

                assert.deepEqual(body.automations[0].edges, []);
                assert.equal(body.automations[0].actions.length, 1);
                assert.equal(body.automations[0].actions[0].type, 'send_email');
                assert.equal(body.automations[0].actions[0].data.email_subject, `${automation.slug} subject`);
                assert.equal(body.automations[0].actions[0].data.email_lexical, NON_EMPTY_EMAIL_LEXICAL);
                assert.equal(body.automations[0].actions[0].data.email_design_setting_id, TEST_EMAIL_DESIGN_SETTING_ID);
            }
        }

        it('returns automations sourced from the database', async function () {
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

        it('returns null last run timestamps for automations without runs', async function () {
            const {body} = await agent.get('automations').expectStatus(200);

            assert.deepEqual(body.automations.map(automation => automation.stats.last_run_created_at), [null, null]);
        });

        it('returns latest automation run timestamp', async function () {
            enableAutomationsLabsFlag();
            const {body: beforeBody} = await agent.get('automations').expectStatus(200);
            const automationId = beforeBody.automations[0].id;

            const beforeFirstSignup = new Date();
            // Run timestamps are stored at second precision
            beforeFirstSignup.setMilliseconds(0);

            await signUpMember('automation-latest-run-1@example.com');
            const afterFirstRun = await waitForTotalRunCount(automationId, 1);
            const firstRunCreatedAt = new Date(afterFirstRun.stats.last_run_created_at);
            assert.ok(firstRunCreatedAt >= beforeFirstSignup);
            assert.ok(firstRunCreatedAt <= new Date());

            // Wait for the clock to reach a later second so the second run's
            // timestamp is distinguishable from the first
            await new Promise((resolve) => {
                setTimeout(resolve, 1100);
            });

            await signUpMember('automation-latest-run-2@example.com');
            const afterSecondRun = await waitForTotalRunCount(automationId, 2);
            assert.ok(new Date(afterSecondRun.stats.last_run_created_at) > firstRunCreatedAt);
        });

        it('returns zero total run counts for automations without runs', async function () {
            const {body} = await agent.get('automations').expectStatus(200);

            assert.deepEqual(body.automations.map(automation => automation.stats.total_run_count), [0, 0]);
        });

        it('returns the total automation run count', async function () {
            enableAutomationsLabsFlag();
            const {body: beforeBody} = await agent.get('automations').expectStatus(200);
            const automationId = beforeBody.automations[0].id;

            await signUpMember('automation-run-count-1@example.com');
            await signUpMember('automation-run-count-2@example.com');

            const automation = await waitForTotalRunCount(automationId, 2);

            assert.equal(automation.stats.total_run_count, 2);
        });

        it('returns zero in progress run counts for automations without runs', async function () {
            const {body} = await agent.get('automations').expectStatus(200);

            assert.deepEqual(body.automations.map(automation => automation.stats.in_progress_run_count), [0, 0]);
        });

        it('returns the number of runs with pending steps', async function () {
            enableAutomationsLabsFlag();
            const {body: beforeBody} = await agent.get('automations').expectStatus(200);
            const automationId = beforeBody.automations[0].id;

            await signUpMember('automation-pending-run-1@example.com');
            await signUpMember('automation-pending-run-2@example.com');
            await waitForTotalRunCount(automationId, 2);

            // Deactivating the automation cancels the pending steps of the
            // first two runs, so they are no longer in progress
            const {body: readBody} = await agent.get(`automations/${automationId}`).expectStatus(200);
            const {actions, edges} = readBody.automations[0];
            await agent
                .put(`automations/${automationId}`)
                .body({automations: [{status: 'inactive', actions, edges}]})
                .expectStatus(200);
            await agent
                .put(`automations/${automationId}`)
                .body({automations: [{status: 'active', actions, edges}]})
                .expectStatus(200);

            await signUpMember('automation-pending-run-3@example.com');
            const automation = await waitForTotalRunCount(automationId, 3);

            assert.equal(automation.stats.in_progress_run_count, 1);
        });

        it('upserts the default free and paid automations', async function () {
            // Reset to the state of a site that has never had automations
            await cleanupAutomationsFixture();
            await upsertEmailDesignSetting();

            const {body: firstBrowseBody} = await agent
                .get('automations/')
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            const automations = firstBrowseBody.automations;

            assert.deepEqual(automations.map(({name, slug, status}) => ({name, slug, status})), [{
                name: 'Free member welcome flow',
                slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
                status: 'inactive'
            }, {
                name: 'Paid member welcome flow',
                slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
                status: 'inactive'
            }]);

            await createWelcomeEmailsForAutomations(automations);

            await agent
                .get('automations/')
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            await assertWelcomeEmailActionsWereCreated(automations);
        });

        it('creates copied send_email actions for default welcome email automations without actions', async function () {
            // Reset to the state of a site that has never had automations, then
            // let browse upsert the default automations — without actions,
            // because there are no welcome emails to copy yet
            await cleanupAutomationsFixture();
            await upsertEmailDesignSetting();

            const {body: firstBrowseBody} = await agent
                .get('automations/')
                .expectStatus(200);
            const automations = firstBrowseBody.automations;

            await createWelcomeEmailsForAutomations(automations);

            await agent
                .get('automations/')
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            await assertWelcomeEmailActionsWereCreated(automations);

            // A subsequent browse must not create duplicate actions
            await agent
                .get('automations/')
                .expectStatus(200);

            await assertWelcomeEmailActionsWereCreated(automations);
        });
    });

    describe('read', function () {
        it('returns the automation, ordered actions, and edges sourced from the database', async function () {
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

        it('returns aggregate click stats for email actions', async function () {
            const {body: browseBody} = await agent.get('automations').expectStatus(200);
            const automationId = browseBody.automations[0].id;
            const {body: readBody} = await agent.get(`automations/${automationId}`).expectStatus(200);
            const action = readBody.automations[0].actions.find(candidate => candidate.type === 'send_email');

            // Sent and clicked counts are accumulated by the email sending and
            // link tracking services, which are out of scope for this test
            await models.Base.knex('automation_action_revisions')
                .where('action_id', action.id)
                .update({email_sent_count: 3, email_clicked_count: 2});

            await agent
                .get(`automations/${automationId}`)
                .expectStatus(200)
                .expect(({body}) => {
                    const emailAction = body.automations[0].actions.find(candidate => candidate.id === action.id);
                    assert.deepEqual(emailAction.stats, {
                        email_clicked_count: 2,
                        email_sent_count: 3,
                        email_opened_count: 0,
                        opened_rate: 0,
                        clicked_rate: 67
                    });
                });
        });
    });

    describe('action links', function () {
        it('returns unique member click counts grouped across revisions', async function () {
            const {body} = await agent.get('automations').expectStatus(200);
            const automationId = body.automations[0].id;
            const {body: readBody} = await agent.get(`automations/${automationId}`).expectStatus(200);
            const action = readBody.automations[0].actions.find(candidate => candidate.type === 'send_email');

            // Editing the email step creates a second revision of the action
            await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: readBody.automations[0].status,
                        actions: readBody.automations[0].actions.map((candidate) => {
                            return candidate.id === action.id ? {
                                ...candidate,
                                data: {...candidate.data, email_subject: 'Updated email'}
                            } : candidate;
                        }),
                        edges: readBody.automations[0].edges
                    }]
                })
                .expectStatus(200);

            // Redirects and member click events are created by the email link
            // tracking service when sent emails are clicked, which is out of
            // scope for this test
            const [firstRevisionId, secondRevisionId] = await models.Base.knex('automation_action_revisions')
                .where('action_id', action.id)
                .orderBy('created_at')
                .pluck('id');

            const redirects = [{
                id: ObjectId().toHexString(),
                from: `/r/${ObjectId().toHexString()}`,
                to: 'https://example.com/alpha',
                to_hash: hashRedirectDestination('https://example.com/alpha'),
                automation_action_revision_id: firstRevisionId,
                created_at: new Date()
            }, {
                id: ObjectId().toHexString(),
                from: `/r/${ObjectId().toHexString()}`,
                to: 'https://example.com/alpha',
                to_hash: hashRedirectDestination('https://example.com/alpha'),
                automation_action_revision_id: secondRevisionId,
                created_at: new Date()
            }, {
                id: ObjectId().toHexString(),
                from: `/r/${ObjectId().toHexString()}`,
                to: 'https://example.com/zero',
                to_hash: hashRedirectDestination('https://example.com/zero'),
                automation_action_revision_id: secondRevisionId,
                created_at: new Date()
            }];
            await models.Base.knex('redirects').insert(redirects);
            await models.Base.knex('members_click_events').insert([{
                id: ObjectId().toHexString(),
                member_id: fixtureManager.get('members', 0).id,
                redirect_id: redirects[0].id,
                created_at: new Date()
            }, {
                id: ObjectId().toHexString(),
                member_id: fixtureManager.get('members', 0).id,
                redirect_id: redirects[1].id,
                created_at: new Date()
            }, {
                id: ObjectId().toHexString(),
                member_id: fixtureManager.get('members', 1).id,
                redirect_id: redirects[1].id,
                created_at: new Date()
            }]);

            const {body: linksBody} = await agent
                .get(`automations/${automationId}/actions/${action.id}/links`)
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());
            assert.deepEqual(linksBody, {
                automation_action_links: [{
                    url: 'https://example.com/alpha',
                    clicked_count: 2
                }, {
                    url: 'https://example.com/zero',
                    clicked_count: 0
                }]
            });
        });

        it('returns 404 when the action belongs to a different automation', async function () {
            const {body} = await agent.get('automations').expectStatus(200);
            const {body: readBody} = await agent
                .get(`automations/${body.automations[0].id}`)
                .expectStatus(200);
            const action = readBody.automations[0].actions[0];

            await agent
                .get(`automations/${body.automations[1].id}/actions/${action.id}/links`)
                .expectStatus(404)
                .expect(cacheInvalidateHeaderNotSet());
        });

        it('requires an authenticated admin', async function () {
            agent.resetAuthentication();
            await agent
                .get(`automations/${ObjectId().toHexString()}/actions/${ObjectId().toHexString()}/links`)
                .expectStatus(403);
            await agent.loginAsOwner();
        });
    });

    describe('email preview', function () {
        it('renders draft content without welcome email content rows', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            await models.Base.knex('welcome_email_automated_emails').del();

            await agent
                .post(`automations/${automationId}/email_preview/`)
                .body({
                    subject: 'Automation Subject',
                    lexical: NON_EMPTY_EMAIL_LEXICAL
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet())
                .expect(({body}) => {
                    assert.equal(body.automation_email_previews.length, 1);
                    assert.equal(body.automation_email_previews[0].subject, 'Automation Subject');
                    assert.match(body.automation_email_previews[0].html, /Lorem ipsum/);
                    assert.match(body.automation_email_previews[0].plaintext, /Lorem ipsum/);
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const welcomeEmailRow = await models.Base.knex('welcome_email_automated_emails')
                .where('welcome_email_automation_id', automationId)
                .first('id');
            assert.equal(welcomeEmailRow, undefined);
        });

        it('cannot render preview for a missing automation', async function () {
            await agent
                .post('automations/abcd1234abcd1234abcd1234/email_preview/')
                .body({
                    subject: 'Automation Subject',
                    lexical: NON_EMPTY_EMAIL_LEXICAL
                })
                .expectStatus(404)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(typeof body.errors[0].id, 'string');
                });
        });

        it('cannot render preview without content', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            await agent
                .post(`automations/${browseBody.automations[0].id}/email_preview/`)
                .body({
                    subject: 'Automation Subject'
                })
                .expectStatus(422)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
                    assert.equal(body.errors[0].property, 'lexical');
                });
        });
    });

    describe('email test', function () {
        it('sends a test email without welcome email content rows', async function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');

            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            await models.Base.knex('welcome_email_automated_emails').del();

            await agent
                .post(`automations/${automationId}/email_test/`)
                .body({
                    email: 'test@ghost.org',
                    subject: 'Automation Subject',
                    lexical: NON_EMPTY_EMAIL_LEXICAL
                })
                .expectStatus(204)
                .expectEmptyBody()
                .expect(cacheInvalidateHeaderNotSet());

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
        });

        it('cannot send a test email to an invalid email address', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            await agent
                .post(`automations/${browseBody.automations[0].id}/email_test/`)
                .body({
                    email: 'not-an-email',
                    subject: 'Automation Subject',
                    lexical: NON_EMPTY_EMAIL_LEXICAL
                })
                .expectStatus(422)
                .expect(({body}) => {
                    assert.equal(body.errors.length, 1);
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
                                email_design_setting_id: TEST_EMAIL_DESIGN_SETTING_ID
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

        it('allows saving an inactive draft with an empty email subject and body', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const emailAction = buildSendEmailAction({email_subject: '', email_lexical: EMPTY_EMAIL_LEXICAL});

            const {body: editBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [emailAction],
                        edges: []
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            assert.equal(editBody.automations[0].status, 'inactive');
            assert.equal(editBody.automations[0].actions[0].data.email_subject, '');
        });

        it('resolves default email design setting slugs when saving a send email action', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;
            const emailAction = buildSendEmailAction({
                email_design_setting_id: 'default-automated-email'
            });

            const {body: editBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'inactive',
                        actions: [emailAction],
                        edges: []
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            const designSettingId = editBody.automations[0].actions[0].data.email_design_setting_id;
            assert.notEqual(designSettingId, 'default-automated-email');
            assert.equal(ObjectId.isValid(designSettingId), true);
        });

        it('rejects activating an automation with an empty email subject', async function () {
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
                        status: 'active',
                        actions: [buildSendEmailAction({email_subject: ''})],
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

        it('rejects activating an automation with an empty email body', async function () {
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
                        status: 'active',
                        actions: [buildSendEmailAction({email_lexical: EMPTY_EMAIL_LEXICAL})],
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

        it('allows activating an automation with complete email steps', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            const automationId = browseBody.automations[0].id;

            const {body: editBody} = await agent
                .put(`automations/${automationId}`)
                .body({
                    automations: [{
                        status: 'active',
                        actions: [buildSendEmailAction()],
                        edges: []
                    }]
                })
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet());

            assert.equal(editBody.automations[0].status, 'active');
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
                    email_design_setting_id: TEST_EMAIL_DESIGN_SETTING_ID
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
                key: schedulerKey
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
