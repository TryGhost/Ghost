import assert from 'node:assert/strict';
import sinon from 'sinon';
import ObjectId from 'bson-objectid';
import {createTemporaryFakeAutomationsDatabase} from '../../../../../core/server/services/automations/temporary-fake-database';
import {createFakeDatabaseAutomationsRepository} from '../../../../../core/server/services/automations/fake-database-automations-repository';
import type {AutomationAction, AutomationsRepository, AutomationStepToRun} from '../../../../../core/server/services/automations/automations-repository';
import type {DatabaseSync, SQLInputValue} from 'node:sqlite';

const HOUR_MS = 60 * 60 * 1000;

const addHours = (dateCol: unknown, hours: number): Date => {
    assert(typeof dateCol === 'string', 'Expected date column to be a string');
    const start = new Date(dateCol).valueOf();
    const delta = hours * HOUR_MS;
    return new Date(start + delta);
};

// These tests are partly coupled to the *fake* repository. We should be able to
// modify it once we have the real repository.
describe('automations repository', function () {
    let database: DatabaseSync;
    let repo: AutomationsRepository;

    const getRunByMemberEmail = (email: string) => (
        database!.prepare(`
            SELECT
                automation_runs.*,
                automations.slug AS automation_slug
            FROM automation_runs
            INNER JOIN automations ON automations.id = automation_runs.automation_id
            WHERE automation_runs.member_email = ?
        `).get(email)
    );

    const getStepByRunId = (runId: SQLInputValue) => (
        database!.prepare(`
            SELECT
                automation_run_steps.*,
                automation_actions.id AS action_id,
                automation_actions.type AS action_type,
                automation_action_revisions.wait_hours AS wait_hours,
                automation_action_revisions.email_subject AS email_subject
            FROM automation_run_steps
            INNER JOIN automation_action_revisions ON automation_action_revisions.id = automation_run_steps.automation_action_revision_id
            INNER JOIN automation_actions ON automation_actions.id = automation_action_revisions.action_id
            WHERE automation_run_steps.automation_run_id = ?
        `).get(runId)
    );

    const getAutomationBySlug = async (slug: string) => {
        const automationSummaries = await repo.browse();
        const automationSummary = automationSummaries.data.find(automation => automation.slug === slug);
        assert(automationSummary);
        const automation = await repo.getById(automationSummary.id);
        assert(automation);
        return automation;
    };

    const getRunCountByAutomationId = (automationId: SQLInputValue) => {
        const result = database!.prepare(`
            SELECT COUNT(*) AS count
            FROM automation_runs
            WHERE automation_id = ?
        `).get(automationId);
        return result?.count;
    };

    const getRevisionCount = (actionId?: string) => {
        const row = actionId
            ? database.prepare('SELECT COUNT(*) AS count FROM automation_action_revisions WHERE action_id = ?').get(actionId)
            : database.prepare('SELECT COUNT(*) AS count FROM automation_action_revisions').get();

        return Number((row as {count: number}).count);
    };

    const getActionByIndex = (automationId: string, index: number) => {
        const result = database!.prepare(`
            SELECT
                automation_actions.id AS action_id,
                automation_actions.type AS action_type,
                automation_action_revisions.id AS revision_id,
                automation_action_revisions.wait_hours AS wait_hours
            FROM automation_actions
            INNER JOIN automation_action_revisions ON automation_action_revisions.action_id = automation_actions.id
            WHERE automation_actions.automation_id = ?
                AND automation_actions.deleted_at IS NULL
            ORDER BY automation_actions.created_at, automation_actions.id
            LIMIT 1 OFFSET ?
        `).get(automationId, index);
        assert(result, 'Expected action to exist');
        return result;
    };

    const insertRun = (automationId: string) => {
        const now = new Date().toISOString();
        const run = {
            id: ObjectId().toHexString(),
            created_at: now,
            updated_at: now,
            automation_id: automationId,
            member_id: ObjectId().toHexString(),
            member_email: 'member@example.com'
        };

        database!.prepare(`
            INSERT INTO automation_runs
            (id, created_at, updated_at, automation_id, member_id, member_email) VALUES
            (:id, :created_at, :updated_at, :automation_id, :member_id, :member_email)
        `).run(run);

        return run;
    };

    const insertStep = (runId: SQLInputValue, revisionId: SQLInputValue, attrs = {}) => {
        const now = new Date().toISOString();
        const step = {
            id: ObjectId().toHexString(),
            created_at: now,
            updated_at: now,
            automation_run_id: runId,
            automation_action_revision_id: revisionId,
            ready_at: now,
            step_attempts: 0,
            started_at: null,
            finished_at: null,
            status: 'pending',
            locked_by: null,
            locked_at: null,
            ...attrs
        };

        database!.prepare(`
            INSERT INTO automation_run_steps
            (
                id,
                created_at,
                updated_at,
                automation_run_id,
                automation_action_revision_id,
                ready_at,
                step_attempts,
                started_at,
                finished_at,
                status,
                locked_by,
                locked_at
            ) VALUES (
                :id,
                :created_at,
                :updated_at,
                :automation_run_id,
                :automation_action_revision_id,
                :ready_at,
                :step_attempts,
                :started_at,
                :finished_at,
                :status,
                :locked_by,
                :locked_at
            )
        `).run(step);

        return step;
    };

    const getStepById = (id: SQLInputValue) => {
        const result = database!.prepare(`
            SELECT *
            FROM automation_run_steps
            WHERE id = ?
        `).get(id);
        assert(result, 'Expected step to exist');
        return result;
    };

    const assertSingleBatchLock = (steps: AutomationStepToRun[]): string => {
        const lockId = steps[0]?.locked_by;
        assert.equal(typeof lockId, 'string');
        assert(steps.every(step => step.locked_by === lockId));
        return lockId;
    };

    const changeWaitHours = (action: AutomationAction, waitHours: number): AutomationAction => {
        assert.equal(action.type, 'wait');
        return {
            ...action,
            data: {
                wait_hours: waitHours
            }
        };
    };

    beforeEach(function () {
        database = createTemporaryFakeAutomationsDatabase();
        repo = createFakeDatabaseAutomationsRepository({
            getDatabase: () => database
        });
    });

    afterEach(function () {
        sinon.restore();
        database.close();
    });

    describe('trigger', function () {
        it('can trigger an automation for a free member', async function () {
            await repo.trigger({
                memberEmail: 'free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });

            const run = getRunByMemberEmail('free@example.com');
            assert(run);
            assert.equal(run.member_email, 'free@example.com');
            assert.equal(run.member_id, 'member_123');
            assert.equal(run.automation_slug, 'member-welcome-email-free');
            assert.equal(run.created_at, run.updated_at);

            const step = getStepByRunId(run.id);
            assert(step);
            assert.equal(step.automation_run_id, run.id);
            assert.equal(step.action_type, 'wait');
            assert.equal(step.wait_hours, 48);
            assert.equal(step.created_at, run.created_at);
            assert.equal(step.updated_at, run.updated_at);
            assert.equal(step.ready_at, addHours(run.created_at, 48).toISOString());
            assert.equal(step.step_attempts, 0);
            assert.equal(step.started_at, null);
            assert.equal(step.finished_at, null);
            assert.equal(step.status, 'pending');
            assert.equal(step.locked_by, null);
            assert.equal(step.locked_at, null);
        });

        it('can trigger an automation for a paid member', async function () {
            await repo.trigger({
                memberEmail: 'paid@example.com',
                memberId: 'member_123',
                memberStatus: 'paid'
            });

            const run = getRunByMemberEmail('paid@example.com');
            assert(run);
            assert.equal(run.automation_slug, 'member-welcome-email-paid');

            const step = getStepByRunId(run.id);
            assert(step);
            assert.equal(step.automation_run_id, run.id);
            assert.equal(step.action_type, 'wait');
        });

        it('inserts the first non-deleted step', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            await repo.edit(automation.id, {
                status: 'active',
                actions: [
                    {
                        id: 'wait-action-to-delete',
                        type: 'wait',
                        data: {wait_hours: 72}
                    },
                    {
                        id: 'main-wait-action',
                        type: 'wait',
                        data: {wait_hours: 24}
                    }
                ],
                edges: [{
                    source_action_id: 'wait-action-to-delete',
                    target_action_id: 'main-wait-action'
                }]
            });
            await repo.edit(automation.id, {
                status: 'active',
                actions: [
                    {
                        id: 'main-wait-action',
                        type: 'wait',
                        data: {wait_hours: 24}
                    }
                ],
                edges: []
            });

            await repo.trigger({
                memberEmail: 'free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });

            const run = getRunByMemberEmail('free@example.com');
            assert(run);

            const step = getStepByRunId(run.id);
            assert(step);
            assert.equal(step.action_id, 'main-wait-action');
        });

        it('does not trigger an automation for an inactive automation', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            await repo.edit(freeAutomation.id, {
                ...freeAutomation,
                status: 'inactive'
            });

            await repo.trigger({
                memberEmail: 'inactive-free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });

            assert.equal(getRunByMemberEmail('inactive-free@example.com'), undefined);
            assert.equal(getRunCountByAutomationId(freeAutomation.id), 0);
        });

        it('does not trigger an automation for an automation with no actions', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            await repo.edit(freeAutomation.id, {
                status: 'active',
                actions: [],
                edges: []
            });

            await repo.trigger({
                memberEmail: 'free-no-actions@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });

            assert.equal(getRunByMemberEmail('free-no-actions@example.com'), undefined);
            assert.equal(getRunCountByAutomationId(freeAutomation.id), 0);
        });
    });

    describe('edit', function () {
        it('only inserts action revisions when action data changes', async function () {
            const initialAutomation = await getAutomationBySlug('member-welcome-email-free');
            const initialRevisionCount = getRevisionCount();
            const waitAction = initialAutomation.actions.find(action => action.type === 'wait');
            const unchangedEmailAction = initialAutomation.actions.find(action => action.type === 'send_email');

            assert(waitAction);
            assert(unchangedEmailAction);
            assert.equal(getRevisionCount(waitAction.id), 1);
            assert.equal(getRevisionCount(unchangedEmailAction.id), 1);

            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: initialAutomation.actions,
                edges: initialAutomation.edges
            });

            assert.equal(getRevisionCount(), initialRevisionCount);
            assert.equal(getRevisionCount(waitAction.id), 1);
            assert.equal(getRevisionCount(unchangedEmailAction.id), 1);

            const changedWaitAction = changeWaitHours(waitAction, waitAction.data.wait_hours + 24);

            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [changedWaitAction, unchangedEmailAction],
                edges: [{
                    source_action_id: changedWaitAction.id,
                    target_action_id: unchangedEmailAction.id
                }]
            });

            assert.equal(getRevisionCount(), initialRevisionCount + 1);
            assert.equal(getRevisionCount(waitAction.id), 2);
            assert.equal(getRevisionCount(unchangedEmailAction.id), 1);

            const addedActionId = ObjectId().toString();
            const addedAction: AutomationAction = {
                id: addedActionId,
                type: 'wait',
                data: {
                    wait_hours: 72
                }
            };

            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [changedWaitAction, unchangedEmailAction, addedAction],
                edges: [
                    {
                        source_action_id: changedWaitAction.id,
                        target_action_id: unchangedEmailAction.id
                    },
                    {
                        source_action_id: unchangedEmailAction.id,
                        target_action_id: addedActionId
                    }
                ]
            });

            assert.equal(getRevisionCount(), initialRevisionCount + 2);
            assert.equal(getRevisionCount(waitAction.id), 2);
            assert.equal(getRevisionCount(unchangedEmailAction.id), 1);
            assert.equal(getRevisionCount(addedActionId), 1);
        });
    });

    describe('fetchAndLockSteps', function () {
        const simulateLockRace = (contendedStepId: SQLInputValue) => {
            let hasSimulatedLock = false;
            const originalPrepare = database.prepare.bind(database);
            sinon.stub(database, 'prepare').callsFake((source) => {
                const statement = originalPrepare(source);

                const shouldSimulateLockBySomeoneElse = (
                    !hasSimulatedLock &&
                    source.includes('SELECT id') &&
                    source.includes('FROM automation_run_steps')
                );
                if (!shouldSimulateLockBySomeoneElse) {
                    return statement;
                }

                const originalAll = statement.all.bind(statement);
                sinon.stub(statement, 'all').callsFake((...args) => {
                    const result = originalAll(...args);

                    hasSimulatedLock = true;

                    const lockedAt = new Date().toISOString();
                    originalPrepare(`
                        UPDATE automation_run_steps
                        SET locked_by = ?,
                            locked_at = ?,
                            started_at = ?,
                            updated_at = ?
                        WHERE id = ?
                    `).run('contending-lock', lockedAt, lockedAt, lockedAt, contendedStepId);

                    return result;
                });

                return statement;
            });
        };

        it('locks ready and steps with stale locks, but skips future and recently-locked steps', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const readyStep = insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const staleLockStep = insertStep(run.id, action.revision_id, {
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'old-lock',
                step_attempts: 2
            });
            const finishedStep = insertStep(run.id, action.revision_id, {
                finished_at: new Date(Date.now() - 1000).toISOString(),
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'finished-lock',
                status: 'finished',
                step_attempts: 4
            });
            const futureReadyAt = new Date(Date.now() + 60 * 1000);
            const notReadyYetStep = insertStep(run.id, action.revision_id, {
                ready_at: futureReadyAt.toISOString()
            });
            const recentlyLockedStep = insertStep(run.id, action.revision_id, {
                locked_at: new Date(Date.now() - (29 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'fresh-lock'
            });

            const result = await repo.fetchAndLockSteps(10);

            const actualStepIds = new Set(result.steps.map(step => step.id));
            const expectedStepIds = new Set([readyStep.id, staleLockStep.id]);
            assert.deepEqual(actualStepIds, expectedStepIds);
            assert.equal(result.nextStepReadyAt?.toISOString(), futureReadyAt.toISOString());

            const lockId = assertSingleBatchLock(result.steps);

            const lockedReady = getStepById(readyStep.id);
            assert.equal(lockedReady.status, 'pending');
            assert.equal(lockedReady.step_attempts, 1);
            assert.equal(lockedReady.locked_by, lockId);

            const lockedStaleLock = getStepById(staleLockStep.id);
            assert.equal(lockedStaleLock.status, 'pending');
            assert.equal(lockedStaleLock.step_attempts, 3);
            assert.equal(lockedStaleLock.locked_by, lockId);

            const skippedFinished = getStepById(finishedStep.id);
            assert.equal(skippedFinished.status, 'finished');
            assert.equal(skippedFinished.step_attempts, 4);
            assert.equal(skippedFinished.locked_by, 'finished-lock');

            const skippedNotReadyYet = getStepById(notReadyYetStep.id);
            assert.equal(skippedNotReadyYet.step_attempts, 0);
            assert.equal(skippedNotReadyYet.locked_by, null);

            const skippedRecentlyLocked = getStepById(recentlyLockedStep.id);
            assert.equal(skippedRecentlyLocked.step_attempts, 0);
            assert.equal(skippedRecentlyLocked.locked_by, 'fresh-lock');
        });

        it('returns the next future pending ready_at when no steps can be locked', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const later = new Date(Date.now() + 60 * 1000);
            const sooner = new Date(Date.now() + 30 * 1000);

            insertStep(run.id, action.revision_id, {ready_at: later.toISOString()});
            insertStep(run.id, action.revision_id, {ready_at: sooner.toISOString()});

            const result = await repo.fetchAndLockSteps(10);

            assert.deepEqual(result.steps, []);
            assert(result.nextStepReadyAt);
            assert.equal(result.nextStepReadyAt.toISOString(), sooner.toISOString());
        });

        it('does not schedule an immediate poll when due steps are locked by another worker', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const lockedAt = new Date(Date.now() - 60 * 1000);

            insertStep(run.id, action.revision_id, {
                locked_at: lockedAt.toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'fresh-lock'
            });

            const result = await repo.fetchAndLockSteps(10);

            assert.deepEqual(result.steps, []);
            assert.equal(result.nextStepReadyAt, null);
        });

        it('respects the limit argument', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const readyAt1 = new Date(Date.now() - 2000).toISOString();
            const readyAt2 = new Date(Date.now() - 1000).toISOString();
            const firstStep = insertStep(run.id, action.revision_id, {ready_at: readyAt1});
            const secondStep = insertStep(run.id, action.revision_id, {ready_at: readyAt1});
            const thirdStep = insertStep(run.id, action.revision_id, {ready_at: readyAt2});

            const result = await repo.fetchAndLockSteps(2);

            assert.equal(result.steps.length, 2);
            assert.equal(result.nextStepReadyAt?.toISOString(), readyAt2);

            const lockId = assertSingleBatchLock(result.steps);

            const first = getStepById(firstStep.id);
            const second = getStepById(secondStep.id);
            const third = getStepById(thirdStep.id);
            const allSteps = [first, second, third];

            const lockedSteps = allSteps.filter(step => step.locked_by === lockId);
            assert.equal(lockedSteps.length, 2);

            const notLockedSteps = allSteps.filter(step => step.locked_by !== lockId);
            assert.equal(notLockedSteps.length, 1);
            const [notLockedStep] = notLockedSteps;
            assert(notLockedStep);
            assert.equal(notLockedStep.locked_by, null);
            assert.equal(notLockedStep.step_attempts, 0);
        });

        it('does not return the same steps to concurrent callers', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const readySteps = [
                insertStep(run.id, action.revision_id, {ready_at: readyAt}),
                insertStep(run.id, action.revision_id, {ready_at: readyAt}),
                insertStep(run.id, action.revision_id, {ready_at: readyAt}),
                insertStep(run.id, action.revision_id, {ready_at: readyAt})
            ];

            const [firstResult, secondResult] = await Promise.all([
                repo.fetchAndLockSteps(2),
                repo.fetchAndLockSteps(2)
            ]);

            const firstStepIds = new Set(firstResult.steps.map(step => step.id));
            const secondStepIds = new Set(secondResult.steps.map(step => step.id));
            assert.equal(firstStepIds.size, firstResult.steps.length);
            assert.equal(secondStepIds.size, secondResult.steps.length);
            assert.equal([...firstStepIds].some(id => secondStepIds.has(id)), false);

            const firstLockId = assertSingleBatchLock(firstResult.steps);
            const secondLockId = assertSingleBatchLock(secondResult.steps);
            assert.notEqual(firstLockId, secondLockId);

            const allSteps = readySteps.map(step => getStepById(step.id));
            const lockedSteps = allSteps.filter(step => step.locked_by !== null);
            assert.equal(lockedSteps.length, firstResult.steps.length + secondResult.steps.length);
            assert(lockedSteps.length <= readySteps.length);
        });

        it('handles concurrent locks in the same transaction', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const availableStep = insertStep(run.id, action.revision_id, {ready_at: readyAt});
            const contendedStep = insertStep(run.id, action.revision_id, {ready_at: readyAt});

            simulateLockRace(contendedStep.id);
            const result = await repo.fetchAndLockSteps(2);

            const actualStepIds = new Set(result.steps.map(step => step.id));
            const expectedStepIds = new Set([availableStep.id]);
            assert.deepEqual(actualStepIds, expectedStepIds);
        });

        it('returns the next unlocked ready_at when selected rows lose the lock race', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = getActionByIndex(automation.id, 0);
            const run = insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const contendedStep = insertStep(run.id, action.revision_id, {
                created_at: new Date(Date.now() - 2000).toISOString(),
                ready_at: readyAt
            });
            insertStep(run.id, action.revision_id, {
                created_at: new Date(Date.now() - 1000).toISOString(),
                ready_at: readyAt
            });

            simulateLockRace(contendedStep.id);
            const result = await repo.fetchAndLockSteps(1);

            assert.deepEqual(result.steps, []);
            assert(result.nextStepReadyAt);
            assert.equal(result.nextStepReadyAt.toISOString(), readyAt);
        });
    });

    describe('finishStepAndEnqueueNext', function () {
        // TODO: Tests
    });

    describe('markStepTerminal', function () {
        // TODO: Tests
    });

    describe('retryStep', function () {
        // TODO: Tests
    });
});
