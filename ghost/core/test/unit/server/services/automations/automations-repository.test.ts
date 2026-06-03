import assert from 'node:assert/strict';
import {AutomationsRepository} from '../../../../../core/server/services/automations/automations-repository';
import {createTemporaryFakeAutomationsDatabase} from '../../../../../core/server/services/automations/temporary-fake-database';
import {createFakeDatabaseAutomationsRepository} from '../../../../../core/server/services/automations/fake-database-automations-repository';
import type {DatabaseSync, SQLInputValue} from 'node:sqlite';

const addHours = (dateCol: unknown, hours: number): Date => {
    assert(typeof dateCol === 'string', 'Expected date column to be a string');
    const start = new Date(dateCol).valueOf();
    const delta = hours * 60 * 60 * 1000;
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

    beforeEach(function () {
        database = createTemporaryFakeAutomationsDatabase();
        repo = createFakeDatabaseAutomationsRepository({
            getDatabase: () => database
        });
    });

    afterEach(function () {
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
});
