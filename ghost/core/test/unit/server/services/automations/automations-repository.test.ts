import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import createKnex, {type Knex} from 'knex';
import moment from 'moment';
import {NON_EMPTY_EMAIL_LEXICAL} from '../../../../utils/automations-fixtures';
import {createDatabaseAutomationsRepository} from '../../../../../core/server/services/automations/database-automations-repository';
import type {AutomatedEmailEvents, AutomationAction, AutomationsRepository, AutomationStepToRun} from '../../../../../core/server/services/automations/automations-repository';

const HOUR_MS = 60 * 60 * 1000;
const FAKE_WAIT_HOURS_MULTIPLIER = 2500;
const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const toDatabaseDate = (date: Date | string): string => moment(date).format(DATABASE_DATE_FORMAT);
const toRepositoryDateISOString = (date: Date | string): string => new Date(toDatabaseDate(date)).toISOString();

const addHours = (dateCol: unknown, hours: number): Date => {
    assert(typeof dateCol === 'string', 'Expected date column to be a string');
    return moment(dateCol, DATABASE_DATE_FORMAT).add(hours, 'hours').toDate();
};

const createDatabase = async (): Promise<Knex> => {
    const database = createKnex({
        client: 'better-sqlite3',
        connection: {
            filename: ':memory:'
        },
        pool: {
            min: 1,
            max: 1
        },
        useNullAsDefault: true
    });

    await database.raw('PRAGMA foreign_keys = ON;');

    const id = () => ObjectId().toHexString();
    const now = () => toDatabaseDate(new Date());

    const fakeEmailDesignSettingId = id();
    const defaultEmailDesignSettingId = id();

    await database.schema.createTable('automations', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('slug').notNullable().unique();
        table.text('name').notNullable();
        table.text('status').notNullable();
    });

    await database.schema.createTable('automation_actions', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('deleted_at');
        table.text('automation_id').notNullable().references('id').inTable('automations');
        table.text('type').notNullable();
    });

    await database.schema.createTable('email_design_settings', (table) => {
        table.text('id').primary();
        table.text('slug').notNullable().unique();
        table.text('created_at').notNullable();
        table.text('updated_at');
    });

    await database.schema.createTable('welcome_email_automated_emails', (table) => {
        table.text('id').primary();
        table.text('welcome_email_automation_id').notNullable().references('id').inTable('automations');
        table.text('next_welcome_email_automated_email_id');
        table.integer('delay_days').notNullable();
        table.text('subject').notNullable();
        table.text('lexical');
        table.text('email_design_setting_id').notNullable().references('id').inTable('email_design_settings');
        table.text('created_at').notNullable();
        table.text('updated_at');
    });

    await database.schema.createTable('automation_action_revisions', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('action_id').notNullable().references('id').inTable('automation_actions');
        table.integer('wait_hours');
        table.text('email_subject');
        table.text('email_lexical');
        table.text('email_design_setting_id').references('id').inTable('email_design_settings');
        table.integer('email_sent_count');
        table.integer('email_tracked_sent_count');
        table.integer('email_opened_count');
        table.unique(['created_at', 'action_id']);
    });

    await database.schema.createTable('automation_action_edges', (table) => {
        table.text('source_action_id').notNullable().references('id').inTable('automation_actions');
        table.text('target_action_id').notNullable().references('id').inTable('automation_actions');
        table.primary(['source_action_id', 'target_action_id']);
    });

    await database.schema.createTable('automation_runs', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('automation_id').notNullable().references('id').inTable('automations');
        table.text('member_id'); // not a real foreign key here
        table.text('member_email').notNullable();
    });

    await database.schema.createTable('automation_run_steps', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('automation_run_id').notNullable().references('id').inTable('automation_runs');
        table.text('automation_action_revision_id').notNullable().references('id').inTable('automation_action_revisions');
        table.text('ready_at').notNullable();
        table.integer('step_attempts').notNullable().defaultTo(0);
        table.text('started_at');
        table.text('finished_at');
        table.text('status').notNullable().defaultTo('pending');
        table.text('locked_by');
        table.text('locked_at');
    });

    await database.schema.createTable('automated_email_recipients', (table) => {
        table.text('id').primary();
        table.text('automation_action_revision_id').references('id').inTable('automation_action_revisions');
        table.text('member_id');
        table.text('member_uuid');
        table.text('member_email');
        table.text('member_name');
        table.text('mailgun_message_id');
        table.datetime('delivered_at');
        table.datetime('opened_at');
        table.datetime('clicked_at');
        table.boolean('track_opens').notNullable().defaultTo(false);
        table.boolean('track_clicks').notNullable().defaultTo(false);
        table.datetime('created_at');
        table.datetime('updated_at');
    });

    const freeAutomationId = id();
    const paidAutomationId = id();
    await database('email_design_settings').insert([{
        id: defaultEmailDesignSettingId,
        slug: 'default-automated-email',
        created_at: now(),
        updated_at: now()
    }, {
        id: fakeEmailDesignSettingId,
        slug: 'test-automation-email-design',
        created_at: now(),
        updated_at: now()
    }]);

    await database('automations').insert([{
        id: freeAutomationId,
        created_at: now(),
        updated_at: now(),
        slug: 'member-welcome-email-free',
        name: 'Free member welcome flow',
        status: 'active'
    }, {
        id: paidAutomationId,
        created_at: now(),
        updated_at: now(),
        slug: 'member-welcome-email-paid',
        name: 'Paid member welcome flow',
        status: 'active'
    }]);

    const freeAction1Id = id();
    const freeAction2Id = id();
    const freeAction3Id = id();
    const freeAction4Id = id();
    const paidAction1Id = id();
    const paidAction2Id = id();
    const paidAction3Id = id();
    const paidAction4Id = id();
    await database('automation_actions').insert([{
        id: freeAction1Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'wait'
    }, {
        id: freeAction2Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'send_email'
    }, {
        id: freeAction3Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'wait'
    }, {
        id: freeAction4Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'send_email'
    }, {
        id: paidAction1Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'wait'
    }, {
        id: paidAction2Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'send_email'
    }, {
        id: paidAction3Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'wait'
    }, {
        id: paidAction4Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'send_email'
    }]);

    await database('automation_action_revisions').insert([{
        id: id(),
        created_at: now(),
        action_id: freeAction1Id,
        wait_hours: 48,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    }, {
        id: id(),
        created_at: now(),
        action_id: freeAction2Id,
        wait_hours: null,
        email_subject: 'Welcome!',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: fakeEmailDesignSettingId
    }, {
        id: id(),
        created_at: now(),
        action_id: freeAction3Id,
        wait_hours: 72,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    }, {
        id: id(),
        created_at: now(),
        action_id: freeAction4Id,
        wait_hours: null,
        email_subject: 'Follow up',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: fakeEmailDesignSettingId
    }, {
        id: id(),
        created_at: now(),
        action_id: paidAction1Id,
        wait_hours: 48,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    }, {
        id: id(),
        created_at: now(),
        action_id: paidAction2Id,
        wait_hours: null,
        email_subject: 'Welcome to Paid!',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: fakeEmailDesignSettingId
    }, {
        id: id(),
        created_at: now(),
        action_id: paidAction3Id,
        wait_hours: 72,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    }, {
        id: id(),
        created_at: now(),
        action_id: paidAction4Id,
        wait_hours: null,
        email_subject: 'Exclusive Insights',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: fakeEmailDesignSettingId
    }]);

    await database('automation_action_edges').insert([{
        source_action_id: freeAction1Id,
        target_action_id: freeAction2Id
    }, {
        source_action_id: freeAction2Id,
        target_action_id: freeAction3Id
    }, {
        source_action_id: freeAction3Id,
        target_action_id: freeAction4Id
    }, {
        source_action_id: paidAction1Id,
        target_action_id: paidAction2Id
    }, {
        source_action_id: paidAction2Id,
        target_action_id: paidAction3Id
    }, {
        source_action_id: paidAction3Id,
        target_action_id: paidAction4Id
    }]);

    return database;
};

type ActionRow = {
    revision_id: string;
    [key: string]: unknown;
};

type RunRow = {
    id: string;
    [key: string]: unknown;
};

type KnexQuery = {
    method?: string;
    response?: unknown;
    sql?: string;
};

// These tests are partly coupled to the *fake* repository. We should be able to
// modify it once we have the real repository.
describe('automations repository', function () {
    let knex: Knex;
    let repo: AutomationsRepository;

    const getRunByMemberEmail = async (email: string): Promise<RunRow> => (
        await knex('automation_runs')
            .select(
                'automation_runs.*',
                'automations.slug as automation_slug'
            )
            .innerJoin('automations', 'automations.id', 'automation_runs.automation_id')
            .where('automation_runs.member_email', email)
            .first()
    );

    const getStepByRunId = async (runId: string) => (
        await knex('automation_run_steps')
            .select(
                'automation_run_steps.*',
                'automation_actions.id as action_id',
                'automation_actions.type as action_type',
                'automation_action_revisions.wait_hours as wait_hours',
                'automation_action_revisions.email_subject as email_subject'
            )
            .innerJoin('automation_action_revisions', 'automation_action_revisions.id', 'automation_run_steps.automation_action_revision_id')
            .innerJoin('automation_actions', 'automation_actions.id', 'automation_action_revisions.action_id')
            .where('automation_run_steps.automation_run_id', runId)
            .first()
    );

    const getAutomationBySlug = async (slug: string) => {
        const automationSummaries = await repo.browse();
        const automationSummary = automationSummaries.data.find(automation => automation.slug === slug);
        assert(automationSummary);
        const automation = await repo.getById(automationSummary.id);
        assert(automation);
        return automation;
    };

    const getRunCountByAutomationId = async (automationId: string) => {
        const result = await knex('automation_runs')
            .count({count: '*'})
            .where('automation_id', automationId)
            .first();
        return result?.count;
    };

    const getRevisionCount = async (actionId?: string) => {
        const builder = knex('automation_action_revisions').count({count: '*'});
        const row = await (actionId ? builder.where('action_id', actionId) : builder).first();

        return Number((row as {count: number}).count);
    };

    const getActionByIndex = async (automationId: string, index: number) => {
        const result = await knex('automation_actions')
            .select(
                'automation_actions.id as action_id',
                'automation_actions.type as action_type',
                'automation_action_revisions.id as revision_id',
                'automation_action_revisions.wait_hours as wait_hours'
            )
            .innerJoin('automation_action_revisions', 'automation_action_revisions.action_id', 'automation_actions.id')
            .where('automation_actions.automation_id', automationId)
            .whereNull('automation_actions.deleted_at')
            .orderBy([
                'automation_actions.created_at',
                'automation_actions.id'
            ])
            .offset(index)
            .first();
        assert(result, 'Expected action to exist');
        return result as ActionRow;
    };

    const getLatestActionRevisionByActionId = async (actionId: string) => {
        const result = await knex('automation_actions')
            .select(
                'automation_actions.id as action_id',
                'automation_actions.type as action_type',
                'automation_action_revisions.id as revision_id',
                'automation_action_revisions.wait_hours as wait_hours',
                'automation_action_revisions.email_design_setting_id as email_design_setting_id'
            )
            .innerJoin('automation_action_revisions', 'automation_action_revisions.action_id', 'automation_actions.id')
            .where('automation_actions.id', actionId)
            .whereNull('automation_actions.deleted_at')
            .orderBy('automation_action_revisions.created_at', 'desc')
            .orderBy('automation_action_revisions.id', 'desc')
            .first();
        assert(result, 'Expected action revision to exist');
        return result;
    };

    const insertRun = async (automationId: string) => {
        const now = toDatabaseDate(new Date());
        const run = {
            id: ObjectId().toHexString(),
            created_at: now,
            updated_at: now,
            automation_id: automationId,
            member_id: ObjectId().toHexString(),
            member_email: 'member@example.com'
        };

        await knex('automation_runs').insert(run);

        return run;
    };

    const normalizeDateColumns = (row: Record<string, unknown>, columns: string[]) => {
        for (const column of columns) {
            const value = row[column];
            if (typeof value === 'string' || value instanceof Date) {
                row[column] = toDatabaseDate(value);
            }
        }
    };

    const insertStep = async (runId: string, revisionId: string, attrs: Record<string, unknown> = {}) => {
        const now = toDatabaseDate(new Date());
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
        normalizeDateColumns(step, [
            'created_at',
            'updated_at',
            'ready_at',
            'started_at',
            'finished_at',
            'locked_at'
        ]);

        await knex('automation_run_steps').insert(step);

        return step;
    };

    const getStepById = async (id: string) => {
        const result = await knex('automation_run_steps')
            .select('*')
            .where('id', id)
            .first();
        assert(result, 'Expected step to exist');
        return result;
    };

    const getStepsByRunId = async (runId: string) => (
        await knex('automation_run_steps')
            .select('*')
            .where('automation_run_id', runId)
            .orderBy([
                'created_at',
                'id'
            ])
    );

    const getLockedStep = async (stepId: string): Promise<AutomationStepToRun> => {
        const {steps} = await repo.fetchAndLockSteps(10);
        const step = steps.find(candidate => candidate.id === stepId);
        assert(step);
        return step;
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

    beforeEach(async function () {
        knex = await createDatabase();
        repo = createDatabaseAutomationsRepository({
            knex,
            fakeWaitHoursMultiplier: null
        });
    });

    afterEach(async function () {
        await knex?.destroy();
    });

    describe('browse', function () {
        const deleteActionsForAutomationIds = async (automationIds: string[]) => {
            const actionIds = await knex('automation_actions')
                .whereIn('automation_id', automationIds)
                .pluck('id');
            await knex('automation_action_edges')
                .whereIn('source_action_id', actionIds)
                .orWhereIn('target_action_id', actionIds)
                .del();
            await knex('automation_action_revisions')
                .whereIn('action_id', actionIds)
                .del();
            await knex('automation_actions')
                .whereIn('id', actionIds)
                .del();
        };

        const getWelcomeEmailDesignSettingId = async () => {
            const row = await knex('email_design_settings')
                .select('id')
                .where('slug', 'test-automation-email-design')
                .first();
            assert(row);
            return row.id;
        };

        const createWelcomeEmailsForAutomations = async (automations: Array<{id: string; slug: string}>) => {
            const emailDesignSettingId = await getWelcomeEmailDesignSettingId();
            await knex('welcome_email_automated_emails').insert(automations.map(automation => ({
                id: ObjectId().toHexString(),
                welcome_email_automation_id: automation.id,
                next_welcome_email_automated_email_id: null,
                delay_days: 0,
                subject: `${automation.slug} subject`,
                lexical: NON_EMPTY_EMAIL_LEXICAL,
                email_design_setting_id: emailDesignSettingId,
                created_at: toDatabaseDate(new Date()),
                updated_at: toDatabaseDate(new Date())
            })));
            return emailDesignSettingId;
        };

        const assertWelcomeEmailActionsWereCreated = async (automations: Array<{id: string; slug: string}>, emailDesignSettingId: string) => {
            for (const automation of automations) {
                const result = await repo.getById(automation.id);
                assert(result);
                assert.deepEqual(result.edges, []);
                assert.equal(result.actions.length, 1);
                const action = result.actions[0];
                assert.equal(action.type, 'send_email');
                if (action.type !== 'send_email') {
                    assert.fail('Expected a send_email action');
                }
                assert.equal(action.data.email_subject, `${automation.slug} subject`);
                assert.equal(action.data.email_lexical, NON_EMPTY_EMAIL_LEXICAL);
                assert.equal(action.data.email_design_setting_id, emailDesignSettingId);
            }
        };

        it('returns a list of automations, ordered by name', async function () {
            await knex('automations').insert({
                id: ObjectId().toHexString(),
                created_at: toDatabaseDate(new Date()),
                updated_at: toDatabaseDate(new Date()),
                slug: 'alpha-flow',
                name: 'Alpha flow',
                status: 'inactive'
            });

            const result = await repo.browse();

            const names = result.data.map(automation => automation.name);

            assert.deepEqual(names, [
                'Alpha flow',
                'Free member welcome flow',
                'Paid member welcome flow'
            ]);
        });

        it('creates missing default free and paid automations', async function () {
            const automationIds = await knex('automations')
                .whereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid'])
                .pluck('id');

            await deleteActionsForAutomationIds(automationIds);
            await knex('automations')
                .whereIn('id', automationIds)
                .del();

            await repo.browse();

            const automations = await knex('automations')
                .select('id', 'name', 'slug', 'status')
                .whereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid'])
                .orderBy('slug');

            assert.deepEqual(automations.map(({name, slug, status}) => ({name, slug, status})), [{
                name: 'Free member welcome flow',
                slug: 'member-welcome-email-free',
                status: 'inactive'
            }, {
                name: 'Paid member welcome flow',
                slug: 'member-welcome-email-paid',
                status: 'inactive'
            }]);

            const emailDesignSettingId = await createWelcomeEmailsForAutomations(automations);

            await repo.browse();

            await assertWelcomeEmailActionsWereCreated(automations, emailDesignSettingId);
        });

        it('creates copied send_email actions for default automations without actions', async function () {
            const automations = await knex('automations')
                .select('id', 'slug')
                .whereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid']);
            const automationIds = automations.map(automation => automation.id);

            await deleteActionsForAutomationIds(automationIds);
            const emailDesignSettingId = await createWelcomeEmailsForAutomations(automations);

            await repo.browse();

            await assertWelcomeEmailActionsWereCreated(automations, emailDesignSettingId);

            await repo.browse();

            const totalActions = await knex('automation_actions')
                .whereIn('automation_id', automationIds)
                .whereNull('deleted_at')
                .count({count: 'id'})
                .first();

            assert.equal(Number(totalActions?.count), 2);
        });
    });

    describe('email stats', function () {
        it('reports the opened count and rate as 0 when there are sends but no recorded opens', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const emailAction = automation.actions.find(action => action.type === 'send_email');
            assert(emailAction);

            await knex('automation_action_revisions')
                .where('action_id', emailAction.id)
                .update({
                    email_sent_count: 3,
                    email_opened_count: null
                });

            const result = await repo.getById(automation.id);
            assert(result);
            const action = result.actions.find(candidate => candidate.id === emailAction.id);
            assert(action);
            if (action.type !== 'send_email') {
                assert.fail('Expected a send_email action');
            }
            assert.deepEqual(action.stats, {
                email_sent_count: 3,
                email_opened_count: 0,
                opened_rate: 0,
                clicked_rate: null
            });
        });

        it('reports zero counts and null rates when there are no sends', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = automation.actions.find(candidate => candidate.type === 'send_email');
            assert(action);
            if (action.type !== 'send_email') {
                assert.fail('Expected a send_email action');
            }
            assert.deepEqual(action.stats, {
                email_sent_count: 0,
                email_opened_count: 0,
                opened_rate: null,
                clicked_rate: null
            });
        });

        it('calculates the open rate from the total sent count', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const emailAction = automation.actions.find(action => action.type === 'send_email');
            assert(emailAction);

            await knex('automation_action_revisions')
                .where('action_id', emailAction.id)
                .update({
                    email_sent_count: 4,
                    email_opened_count: 3
                });

            const result = await repo.getById(automation.id);
            assert(result);
            const action = result.actions.find(candidate => candidate.id === emailAction.id);
            assert(action);
            if (action.type !== 'send_email') {
                assert.fail('Expected a send_email action');
            }
            assert.deepEqual(action.stats, {
                email_sent_count: 4,
                email_opened_count: 3,
                opened_rate: 75,
                clicked_rate: null
            });
        });
    });

    describe('trigger', function () {
        it('can trigger an automation for a free member', async function () {
            await repo.trigger({
                memberEmail: 'free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });

            const run = await getRunByMemberEmail('free@example.com');
            assert(run);
            assert.equal(run.member_email, 'free@example.com');
            assert.equal(run.member_id, 'member_123');
            assert.equal(run.automation_slug, 'member-welcome-email-free');
            assert.equal(run.created_at, run.updated_at);

            const step = await getStepByRunId(run.id);
            assert(step);
            assert.equal(step.automation_run_id, run.id);
            assert.equal(step.action_type, 'wait');
            assert.equal(step.wait_hours, 48);
            assert.equal(step.created_at, run.created_at);
            assert.equal(step.updated_at, run.updated_at);
            assert.equal(step.ready_at, toDatabaseDate(addHours(run.created_at, 48)));
            assert.equal(step.step_attempts, 0);
            assert.equal(step.started_at, null);
            assert.equal(step.finished_at, null);
            assert.equal(step.status, 'pending');
            assert.equal(step.locked_by, null);
            assert.equal(step.locked_at, null);
        });

        it('uses the fake wait hours multiplier for triggered wait actions when configured', async function () {
            repo = createDatabaseAutomationsRepository({
                knex,
                fakeWaitHoursMultiplier: FAKE_WAIT_HOURS_MULTIPLIER
            });

            const beforeTrigger = Date.now();
            await repo.trigger({
                memberEmail: 'fake-wait@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });
            const afterTrigger = Date.now();

            const run = await getRunByMemberEmail('fake-wait@example.com');
            assert(run);

            const step = await getStepByRunId(run.id);
            assert(step);
            const readyAtMs = moment(step.ready_at, DATABASE_DATE_FORMAT).valueOf();
            assert(readyAtMs >= beforeTrigger + (48 * FAKE_WAIT_HOURS_MULTIPLIER) - 999);
            assert(readyAtMs <= afterTrigger + (48 * FAKE_WAIT_HOURS_MULTIPLIER));
        });

        it('can trigger an automation for a paid member', async function () {
            await repo.trigger({
                memberEmail: 'paid@example.com',
                memberId: 'member_123',
                memberStatus: 'paid'
            });

            const run = await getRunByMemberEmail('paid@example.com');
            assert(run);
            assert.equal(run.automation_slug, 'member-welcome-email-paid');

            const step = await getStepByRunId(run.id);
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

            const run = await getRunByMemberEmail('free@example.com');
            assert(run);

            const step = await getStepByRunId(run.id);
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

            assert.equal(await getRunByMemberEmail('inactive-free@example.com'), undefined);
            assert.equal(await getRunCountByAutomationId(freeAutomation.id), 0);
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

            assert.equal(await getRunByMemberEmail('free-no-actions@example.com'), undefined);
            assert.equal(await getRunCountByAutomationId(freeAutomation.id), 0);
        });
    });

    describe('edit', function () {
        const assertValidationError = async (fn: () => Promise<unknown>, property: string, message: RegExp) => {
            await assert.rejects(fn, (error: unknown) => {
                assert(error instanceof errors.ValidationError);
                assert.equal(error.property, property);
                assert.match(error.message, message);
                return true;
            });
        };

        it('cancels pending unlocked steps when disabling an automation', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const step = await insertStep(run.id, action.revision_id);

            const beforeEdit = Date.now();
            await repo.edit(automation.id, {
                ...automation,
                status: 'inactive'
            });
            const afterEdit = Date.now();

            const cancelled = await getStepById(step.id);
            assert.equal(cancelled.status, 'automation disabled');
            assert.equal(cancelled.locked_by, null);
            assert.equal(cancelled.locked_at, null);
            assert.equal(cancelled.started_at, null);
            const cancelledFinishedAt = cancelled.finished_at;
            assert(typeof cancelledFinishedAt === 'string');
            assert(cancelledFinishedAt >= toDatabaseDate(new Date(beforeEdit - 1000)));
            assert(cancelledFinishedAt <= toDatabaseDate(new Date(afterEdit)));
        });

        it('cancels pending steps with expired locks when disabling an automation', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const step = await insertStep(run.id, action.revision_id, {
                locked_by: 'expired-lock',
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                started_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString()
            });

            await repo.edit(automation.id, {
                ...automation,
                status: 'inactive'
            });

            const cancelled = await getStepById(step.id);
            assert.equal(cancelled.status, 'automation disabled');
            assert.equal(cancelled.locked_by, null);
            assert.equal(cancelled.locked_at, null);
            assert.equal(typeof cancelled.finished_at, 'string');
        });

        it('does not cancel pending steps with fresh locks when disabling an automation', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const lockedAt = toDatabaseDate(new Date(Date.now() - (29 * 60 * 1000)));
            const step = await insertStep(run.id, action.revision_id, {
                locked_by: 'fresh-lock',
                locked_at: lockedAt,
                started_at: lockedAt
            });

            await repo.edit(automation.id, {
                ...automation,
                status: 'inactive'
            });

            const unchanged = await getStepById(step.id);
            assert.equal(unchanged.status, 'pending');
            assert.equal(unchanged.locked_by, 'fresh-lock');
            assert.equal(unchanged.locked_at, lockedAt);
            assert.equal(unchanged.finished_at, null);
        });

        it('does not cancel pending steps for other automations when disabling an automation', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            const paidAutomation = await getAutomationBySlug('member-welcome-email-paid');
            const freeAction = await getActionByIndex(freeAutomation.id, 0);
            const paidAction = await getActionByIndex(paidAutomation.id, 0);
            const freeRun = await insertRun(freeAutomation.id);
            const paidRun = await insertRun(paidAutomation.id);
            const freeStep = await insertStep(freeRun.id, freeAction.revision_id);
            const paidStep = await insertStep(paidRun.id, paidAction.revision_id);

            await repo.edit(freeAutomation.id, {
                ...freeAutomation,
                status: 'inactive'
            });

            const cancelledFreeStep = await getStepById(freeStep.id);
            assert.equal(cancelledFreeStep.status, 'automation disabled');

            const unchangedPaidStep = await getStepById(paidStep.id);
            assert.equal(unchangedPaidStep.status, 'pending');
            assert.equal(unchangedPaidStep.finished_at, null);
        });

        it('only inserts action revisions when action data changes', async function () {
            const initialAutomation = await getAutomationBySlug('member-welcome-email-free');
            const initialRevisionCount = await getRevisionCount();
            const waitAction = initialAutomation.actions.find(action => action.type === 'wait');
            const unchangedEmailAction = initialAutomation.actions.find(action => action.type === 'send_email');

            assert(waitAction);
            assert(unchangedEmailAction);
            assert.equal(await getRevisionCount(waitAction.id), 1);
            assert.equal(await getRevisionCount(unchangedEmailAction.id), 1);

            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: initialAutomation.actions,
                edges: initialAutomation.edges
            });

            assert.equal(await getRevisionCount(), initialRevisionCount);
            assert.equal(await getRevisionCount(waitAction.id), 1);
            assert.equal(await getRevisionCount(unchangedEmailAction.id), 1);

            const changedWaitAction = changeWaitHours(waitAction, waitAction.data.wait_hours + 24);

            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [changedWaitAction, unchangedEmailAction],
                edges: [{
                    source_action_id: changedWaitAction.id,
                    target_action_id: unchangedEmailAction.id
                }]
            });

            assert.equal(await getRevisionCount(), initialRevisionCount + 1);
            assert.equal(await getRevisionCount(waitAction.id), 2);
            assert.equal(await getRevisionCount(unchangedEmailAction.id), 1);

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

            assert.equal(await getRevisionCount(), initialRevisionCount + 2);
            assert.equal(await getRevisionCount(waitAction.id), 2);
            assert.equal(await getRevisionCount(unchangedEmailAction.id), 1);
            assert.equal(await getRevisionCount(addedActionId), 1);
        });

        it('resolves default email design setting slugs to the default design setting id', async function () {
            const initialAutomation = await getAutomationBySlug('member-welcome-email-free');
            const addedActionId = ObjectId().toString();
            const addedAction: AutomationAction = {
                id: addedActionId,
                type: 'send_email',
                data: {
                    email_subject: 'Welcome',
                    email_lexical: NON_EMPTY_EMAIL_LEXICAL,
                    email_design_setting_id: 'default-automated-email'
                }
            };

            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [addedAction],
                edges: []
            });

            const defaultDesignSetting = await knex('email_design_settings')
                .select('id')
                .where('slug', 'default-automated-email')
                .first();
            const revision = await getLatestActionRevisionByActionId(addedActionId);

            assert.equal(revision.email_design_setting_id, defaultDesignSetting.id);
        });

        it('rejects changing an action that is part of another automation', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            const paidAutomation = await getAutomationBySlug('member-welcome-email-paid');
            const paidAction = paidAutomation.actions[0];

            await assertValidationError(async () => repo.edit(freeAutomation.id, {
                status: 'inactive',
                actions: [paidAction],
                edges: []
            }), 'actions.id', /already exists/);
        });

        it('rejects changing a soft-deleted action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const now = toDatabaseDate(new Date());
            const softDeletedActionId = ObjectId().toString();
            await knex('automation_actions').insert({
                id: softDeletedActionId,
                created_at: now,
                updated_at: now,
                deleted_at: now,
                automation_id: automation.id,
                type: 'wait'
            });

            await assertValidationError(async () => repo.edit(automation.id, {
                status: 'inactive',
                actions: [{
                    id: softDeletedActionId,
                    type: 'wait',
                    data: {
                        wait_hours: 24
                    }
                }],
                edges: []
            }), 'actions.id', /already exists/);
        });

        it('rejects changing the type of an action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const waitAction = automation.actions.find(action => action.type === 'wait');
            const emailAction = automation.actions.find(action => action.type === 'send_email');
            assert(waitAction, 'test setup expects wait action');
            assert.equal(emailAction?.type, 'send_email', 'test setup expects email action');

            await assertValidationError(async () => repo.edit(automation.id, {
                status: 'inactive',
                actions: [{
                    id: waitAction.id,
                    type: 'send_email',
                    data: emailAction.data
                }],
                edges: []
            }), 'actions.type', /different type/);
        });
    });

    describe('fetchAndLockSteps', function () {
        const isCandidateStepSelect = (query: KnexQuery) => {
            const sql = query.sql?.toLowerCase() ?? '';
            return (
                query.method === 'select' &&
                sql.includes('select `id`') &&
                sql.includes('from `automation_run_steps`')
            );
        };

        const includesStepId = (response: unknown, stepId: string) => (
            Array.isArray(response) &&
            response.some(row => (
                typeof row === 'object' &&
                row !== null &&
                'id' in row &&
                row.id === stepId
            ))
        );

        const simulateLockRace = (contendedStepId: string) => {
            let hasSimulatedLock = false;

            const originalTransaction = knex.transaction.bind(knex);

            const mockTransaction = async (
                scope: (_trx: Knex.Transaction) => Promise<unknown>,
                config?: Knex.TransactionConfig
            ) => (
                originalTransaction(async (trx: Knex.Transaction) => {
                    const {client} = trx;

                    const originalQuery = client.query.bind(client);
                    client.query = async (connection: unknown, query: KnexQuery) => {
                        const result = await originalQuery(connection, query);
                        if (
                            !hasSimulatedLock &&
                            isCandidateStepSelect(query) &&
                            includesStepId(result.response, contendedStepId)
                        ) {
                            hasSimulatedLock = true;
                            const lockedAt = toDatabaseDate(new Date());
                            await trx('automation_run_steps')
                                .update({
                                    locked_by: 'contending-lock',
                                    locked_at: lockedAt,
                                    started_at: lockedAt,
                                    updated_at: lockedAt
                                })
                                .where('id', contendedStepId);
                            client.query = originalQuery;
                        }
                        return result;
                    };

                    return await scope(trx);
                }, config)
            );

            const mockKnex = new Proxy(knex, {
                get(target, property, receiver) {
                    if (property === 'transaction') {
                        return mockTransaction;
                    }
                    return Reflect.get(target, property, receiver);
                }
            }) as Knex;

            repo = createDatabaseAutomationsRepository({
                knex: mockKnex,
                fakeWaitHoursMultiplier: null
            });
        };

        const assertContendedStepWasLocked = async (stepId: string) => {
            const step = await getStepById(stepId);
            assert.equal(step.locked_by, 'contending-lock');
            assert.equal(typeof step.locked_at, 'string');
            assert.equal(step.started_at, step.locked_at);
            assert.equal(step.updated_at, step.locked_at);
        };

        it('locks ready and steps with stale locks, but skips future and recently-locked steps', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyStep = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const staleLockStep = await insertStep(run.id, action.revision_id, {
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'old-lock',
                step_attempts: 2
            });
            const finishedStep = await insertStep(run.id, action.revision_id, {
                finished_at: new Date(Date.now() - 1000).toISOString(),
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'finished-lock',
                status: 'finished',
                step_attempts: 4
            });
            const futureReadyAt = new Date(Date.now() + 60 * 1000);
            const notReadyYetStep = await insertStep(run.id, action.revision_id, {
                ready_at: futureReadyAt.toISOString()
            });
            const recentlyLockedStep = await insertStep(run.id, action.revision_id, {
                locked_at: new Date(Date.now() - (29 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'fresh-lock'
            });

            const result = await repo.fetchAndLockSteps(10);

            const actualStepIds = new Set(result.steps.map(step => step.id));
            const expectedStepIds = new Set([readyStep.id, staleLockStep.id]);
            assert.deepEqual(actualStepIds, expectedStepIds);
            assert.equal(result.nextStepReadyAt?.toISOString(), toRepositoryDateISOString(futureReadyAt));

            const lockId = assertSingleBatchLock(result.steps);

            const lockedReady = await getStepById(readyStep.id);
            assert.equal(lockedReady.status, 'pending');
            assert.equal(lockedReady.step_attempts, 1);
            assert.equal(lockedReady.locked_by, lockId);

            const lockedStaleLock = await getStepById(staleLockStep.id);
            assert.equal(lockedStaleLock.status, 'pending');
            assert.equal(lockedStaleLock.step_attempts, 3);
            assert.equal(lockedStaleLock.locked_by, lockId);

            const skippedFinished = await getStepById(finishedStep.id);
            assert.equal(skippedFinished.status, 'finished');
            assert.equal(skippedFinished.step_attempts, 4);
            assert.equal(skippedFinished.locked_by, 'finished-lock');

            const skippedNotReadyYet = await getStepById(notReadyYetStep.id);
            assert.equal(skippedNotReadyYet.step_attempts, 0);
            assert.equal(skippedNotReadyYet.locked_by, null);

            const skippedRecentlyLocked = await getStepById(recentlyLockedStep.id);
            assert.equal(skippedRecentlyLocked.step_attempts, 0);
            assert.equal(skippedRecentlyLocked.locked_by, 'fresh-lock');
        });

        it('returns the next future pending ready_at when no steps can be locked', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const later = new Date(Date.now() + 60 * 1000);
            const sooner = new Date(Date.now() + 30 * 1000);

            await insertStep(run.id, action.revision_id, {ready_at: later.toISOString()});
            await insertStep(run.id, action.revision_id, {ready_at: sooner.toISOString()});

            const result = await repo.fetchAndLockSteps(10);

            assert.deepEqual(result.steps, []);
            assert(result.nextStepReadyAt);
            assert.equal(result.nextStepReadyAt.toISOString(), toRepositoryDateISOString(sooner));
        });

        it('does not schedule an immediate poll when due steps are locked by another worker', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const lockedAt = new Date(Date.now() - 60 * 1000);

            await insertStep(run.id, action.revision_id, {
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
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt1 = new Date(Date.now() - 2000).toISOString();
            const readyAt2 = new Date(Date.now() - 1000).toISOString();
            const firstStep = await insertStep(run.id, action.revision_id, {ready_at: readyAt1});
            const secondStep = await insertStep(run.id, action.revision_id, {ready_at: readyAt1});
            const thirdStep = await insertStep(run.id, action.revision_id, {ready_at: readyAt2});

            const result = await repo.fetchAndLockSteps(2);

            assert.equal(result.steps.length, 2);
            assert.equal(result.nextStepReadyAt?.toISOString(), toRepositoryDateISOString(readyAt2));

            const lockId = assertSingleBatchLock(result.steps);

            const first = await getStepById(firstStep.id);
            const second = await getStepById(secondStep.id);
            const third = await getStepById(thirdStep.id);
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
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const readySteps = await Promise.all([
                insertStep(run.id, action.revision_id, {ready_at: readyAt}),
                insertStep(run.id, action.revision_id, {ready_at: readyAt}),
                insertStep(run.id, action.revision_id, {ready_at: readyAt}),
                insertStep(run.id, action.revision_id, {ready_at: readyAt})
            ]);

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

            const allSteps = await Promise.all(readySteps.map(step => getStepById(step.id)));
            const lockedSteps = allSteps.filter(step => step.locked_by !== null);
            assert.equal(lockedSteps.length, firstResult.steps.length + secondResult.steps.length);
            assert(lockedSteps.length <= readySteps.length);
        });

        it('handles concurrent locks in the same transaction', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const availableStep = await insertStep(run.id, action.revision_id, {ready_at: readyAt});
            const contendedStep = await insertStep(run.id, action.revision_id, {ready_at: readyAt});

            simulateLockRace(contendedStep.id);
            const result = await repo.fetchAndLockSteps(2);

            const actualStepIds = new Set(result.steps.map(step => step.id));
            const expectedStepIds = new Set([availableStep.id]);
            assert.deepEqual(actualStepIds, expectedStepIds);
            await assertContendedStepWasLocked(contendedStep.id);
        });

        it('returns the next unlocked ready_at when selected rows lose the lock race', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const contendedStep = await insertStep(run.id, action.revision_id, {
                created_at: new Date(Date.now() - 2000).toISOString(),
                ready_at: readyAt
            });
            await insertStep(run.id, action.revision_id, {
                created_at: new Date(Date.now() - 1000).toISOString(),
                ready_at: readyAt
            });

            simulateLockRace(contendedStep.id);
            const result = await repo.fetchAndLockSteps(1);

            assert.deepEqual(result.steps, []);
            assert(result.nextStepReadyAt);
            assert.equal(result.nextStepReadyAt.toISOString(), toRepositoryDateISOString(readyAt));
            await assertContendedStepWasLocked(contendedStep.id);
        });
    });

    describe('finishStepAndEnqueueNext', function () {
        it('finishes a locked step and enqueues the next action revision', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const lockedStep = await getStepById(step.id);

            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();

            assert(nextReadyAt);
            assert(nextReadyAt.getTime() >= beforeFinish);
            assert(nextReadyAt.getTime() <= afterFinish);

            const finished = await getStepById(stepRow.id);
            assert.equal(finished.status, 'finished');
            assert.equal(finished.locked_by, null);
            assert.equal(finished.locked_at, null);
            assert.equal(finished.started_at, lockedStep.started_at);
            assert.equal(finished.ready_at, stepRow.ready_at);
            assert.equal(finished.step_attempts, 1);
            assert.equal(typeof finished.finished_at, 'string');

            const allSteps = await getStepsByRunId(run.id);
            assert.equal(allSteps.length, 2);
            const nextStep = allSteps.find(candidate => candidate.id !== stepRow.id);
            assert(nextStep);
            const nextAction = await getActionByIndex(automation.id, 1);
            assert.equal(nextStep.automation_run_id, run.id);
            assert.equal(nextStep.automation_action_revision_id, nextAction.revision_id);
            assert.equal(nextStep.status, 'pending');
            assert.equal(nextStep.ready_at, toDatabaseDate(nextReadyAt));
        });

        it('uses wait hours when the next action is a wait action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const sendEmailAction = await getActionByIndex(automation.id, 1);
            assert.equal(sendEmailAction.action_type, 'send_email');
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, sendEmailAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);

            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();

            assert(nextReadyAt);
            assert(nextReadyAt.getTime() >= beforeFinish + (72 * HOUR_MS));
            assert(nextReadyAt.getTime() <= afterFinish + (72 * HOUR_MS));
        });

        it('uses the fake wait hours multiplier when configured', async function () {
            repo = createDatabaseAutomationsRepository({
                knex,
                fakeWaitHoursMultiplier: FAKE_WAIT_HOURS_MULTIPLIER
            });
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const sendEmailAction = await getActionByIndex(automation.id, 1);
            assert.equal(sendEmailAction.action_type, 'send_email');
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, sendEmailAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);

            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();

            assert(nextReadyAt);
            assert(nextReadyAt.getTime() >= beforeFinish + (72 * FAKE_WAIT_HOURS_MULTIPLIER));
            assert(nextReadyAt.getTime() <= afterFinish + (72 * FAKE_WAIT_HOURS_MULTIPLIER));
        });

        it('does not enqueue a duplicate next step when called again with the same locked step', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);

            const firstNextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const secondNextReadyAt = await repo.finishStepAndEnqueueNext(step);

            assert(firstNextReadyAt);
            assert.equal(secondNextReadyAt, null);

            const allSteps = await getStepsByRunId(run.id);
            assert.equal(allSteps.length, 2);

            const finished = await getStepById(stepRow.id);
            assert.equal(finished.status, 'finished');
            assert.equal(finished.locked_by, null);
            assert.equal(finished.locked_at, null);
        });

        it('does not enqueue the next step when the automation was disabled after the step was locked', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);

            await knex('automations')
                .update({
                    status: 'inactive',
                    updated_at: toDatabaseDate(new Date())
                })
                .where('id', automation.id);

            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);

            assert.equal(nextReadyAt, null);

            const finished = await getStepById(stepRow.id);
            assert.equal(finished.status, 'finished');
            assert.equal(finished.locked_by, null);
            assert.equal(finished.locked_at, null);

            const allSteps = await getStepsByRunId(run.id);
            assert.equal(allSteps.length, 1);
        });

        it('does not finish or enqueue if the step lock has been taken by another runner', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const otherLockedAt = new Date().toISOString();

            await knex('automation_run_steps')
                .update({
                    locked_by: 'other-runner-lock',
                    locked_at: otherLockedAt,
                    updated_at: otherLockedAt
                })
                .where('id', stepRow.id);

            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);

            assert.equal(nextReadyAt, null);

            const unchanged = await getStepById(stepRow.id);
            assert.equal(unchanged.status, 'pending');
            assert.equal(unchanged.locked_by, 'other-runner-lock');
            assert.equal(unchanged.locked_at, otherLockedAt);
            assert.equal(unchanged.finished_at, null);

            const allSteps = await getStepsByRunId(run.id);
            assert.equal(allSteps.length, 1);
        });

        it('returns null and does not enqueue when there is no next action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const lastAction = await getActionByIndex(automation.id, 3);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, lastAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);

            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);

            assert.equal(nextReadyAt, null);

            const finished = await getStepById(stepRow.id);
            assert.equal(finished.status, 'finished');
            assert.equal(finished.locked_by, null);
            assert.equal(finished.locked_at, null);

            const allSteps = await getStepsByRunId(run.id);
            assert.equal(allSteps.length, 1);
        });

        it('enqueues the latest revision of the next action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const sendEmailAction = await getActionByIndex(automation.id, 1);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, sendEmailAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const nextActionBeforeEdit = await getActionByIndex(automation.id, 2);

            const waitAction = automation.actions.find(action => action.id === nextActionBeforeEdit.action_id);
            assert(waitAction);
            const updatedWaitAction = changeWaitHours(waitAction, 96);

            await repo.edit(automation.id, {
                status: automation.status,
                actions: automation.actions.map((action) => {
                    if (action.id === updatedWaitAction.id) {
                        return updatedWaitAction;
                    }
                    return action;
                }),
                edges: automation.edges
            });

            const updatedNextAction = await getLatestActionRevisionByActionId(updatedWaitAction.id);
            assert.equal(updatedNextAction.wait_hours, 96);

            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();

            assert(nextReadyAt);
            assert(nextReadyAt.getTime() >= beforeFinish + (96 * HOUR_MS));
            assert(nextReadyAt.getTime() <= afterFinish + (96 * HOUR_MS));

            const allSteps = await getStepsByRunId(run.id);
            assert.equal(allSteps.length, 2);

            const nextStep = allSteps.find(candidate => candidate.id !== stepRow.id);
            assert(nextStep);
            assert.equal(nextStep.automation_action_revision_id, updatedNextAction.revision_id);
            assert.equal(nextStep.ready_at, toDatabaseDate(nextReadyAt));
        });
    });

    describe('markStepTerminal', function () {
        it('marks a locked step with a terminal status and clears the lock', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const lockedStep = await getStepById(step.id);
            assert.equal(typeof lockedStep.started_at, 'string');

            const beforeMark = Date.now();
            const didMark = await repo.markStepTerminal(step, 'member unsubscribed');
            const afterMark = Date.now();

            assert.equal(didMark, true);

            const marked = await getStepById(step.id);
            assert.equal(marked.status, 'member unsubscribed');
            assert.equal(marked.locked_by, null);
            assert.equal(marked.locked_at, null);
            assert.equal(marked.started_at, lockedStep.started_at);
            assert.equal(marked.ready_at, lockedStep.ready_at);
            assert.equal(marked.step_attempts, 1);
            assert.equal((await getStepsByRunId(run.id)).length, 1);
            const markedFinishedAt = marked.finished_at;
            assert(typeof markedFinishedAt === 'string');
            assert(markedFinishedAt >= toDatabaseDate(new Date(beforeMark - 1000)));
            assert(markedFinishedAt <= toDatabaseDate(new Date(afterMark)));
        });

        it('does not overwrite a step that is no longer pending', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const finishedAt = new Date(Date.now() - 500).toISOString();

            await knex('automation_run_steps')
                .update({
                    status: 'finished',
                    finished_at: finishedAt,
                    locked_at: null
                })
                .where('id', step.id);

            const didMark = await repo.markStepTerminal(step, 'member unsubscribed');

            assert.equal(didMark, false);

            const unchanged = await getStepById(step.id);
            assert.equal(unchanged.status, 'finished');
            assert.equal(unchanged.finished_at, finishedAt);
            assert.equal(unchanged.locked_by, step.locked_by);
            assert.equal(unchanged.locked_at, null);
        });

        it('does not mark a step terminal if the step lock has been taken by another runner', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const otherLockedAt = new Date().toISOString();

            await knex('automation_run_steps')
                .update({
                    locked_by: 'other-runner-lock',
                    locked_at: otherLockedAt,
                    updated_at: otherLockedAt
                })
                .where('id', stepRow.id);

            const beforeMark = await getStepById(stepRow.id);
            const didMark = await repo.markStepTerminal(step, 'member unsubscribed');

            assert.equal(didMark, false);

            const unchanged = await getStepById(stepRow.id);
            assert.deepEqual(unchanged, beforeMark);
        });
    });

    describe('retryStep', function () {
        it('reschedules a locked step for retry and clears the lock', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const retryAt = new Date(Date.now() + 60 * 1000);

            const beforeRetry = Date.now();
            const didRetry = await repo.retryStep(step, retryAt);
            const afterRetry = Date.now();

            assert.equal(didRetry, true);

            const retried = await getStepById(step.id);
            assert.equal(retried.status, 'pending');
            assert.equal(retried.ready_at, toDatabaseDate(retryAt));
            assert.equal(retried.started_at, null);
            assert.equal(retried.finished_at, null);
            assert.equal(retried.locked_by, null);
            assert.equal(retried.locked_at, null);
            assert.equal(retried.step_attempts, 1);
            const retriedUpdatedAt = retried.updated_at;
            assert(typeof retriedUpdatedAt === 'string');
            assert(retriedUpdatedAt >= toDatabaseDate(new Date(beforeRetry - 1000)));
            assert(retriedUpdatedAt <= toDatabaseDate(new Date(afterRetry)));
        });

        it('does not retry a locked step that is no longer pending', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const finishedAt = new Date(Date.now() - 500).toISOString();

            await knex('automation_run_steps')
                .update({
                    status: 'finished',
                    finished_at: finishedAt
                })
                .where('id', step.id);

            const beforeRetry = await getStepById(step.id);
            const didRetry = await repo.retryStep(step, new Date(Date.now() + 1000));

            assert.equal(didRetry, false);

            const unchanged = await getStepById(step.id);
            assert.deepEqual(unchanged, beforeRetry);
        });

        it('marks the step disabled instead of retrying when the automation was disabled after the step was locked', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const lockedStep = await getStepById(step.id);

            await knex('automations')
                .update({
                    status: 'inactive',
                    updated_at: toDatabaseDate(new Date())
                })
                .where('id', automation.id);

            const didRetry = await repo.retryStep(step, new Date(Date.now() + 1000));

            assert.equal(didRetry, false);

            const disabled = await getStepById(step.id);
            assert.equal(disabled.status, 'automation disabled');
            assert.equal(disabled.locked_by, null);
            assert.equal(disabled.locked_at, null);
            assert.equal(disabled.started_at, lockedStep.started_at);
            assert.equal(disabled.ready_at, stepRow.ready_at);
            assert.equal(typeof disabled.finished_at, 'string');
        });
    });

    describe('recordEmailSent', function () {
        it('records the recipient and increments the action revision count', async function () {
            const revision = await knex('automation_action_revisions').select('id').first();
            assert(revision);

            await repo.recordEmailSent({
                automationActionRevisionId: revision.id,
                mailgunMessageId: 'mailgun-message-id',
                memberEmail: 'member@example.com',
                memberId: 'member-id',
                memberName: 'Test Member',
                memberUuid: '00000000-0000-4000-8000-000000000001',
                trackClicks: true,
                trackOpens: true
            });

            const recipient = await knex('automated_email_recipients').first();
            assert.deepEqual(recipient, {
                id: recipient.id,
                automation_action_revision_id: revision.id,
                member_id: 'member-id',
                member_uuid: '00000000-0000-4000-8000-000000000001',
                member_email: 'member@example.com',
                member_name: 'Test Member',
                mailgun_message_id: 'mailgun-message-id',
                delivered_at: null,
                opened_at: null,
                clicked_at: null,
                track_clicks: 1,
                track_opens: 1,
                created_at: recipient.created_at,
                updated_at: recipient.updated_at
            });
            assert(ObjectId.isValid(recipient.id));
            assert.equal(typeof recipient.created_at, 'string');
            assert.equal(recipient.updated_at, recipient.created_at);

            const updatedRevision = await knex('automation_action_revisions')
                .select('email_sent_count')
                .where('id', revision.id)
                .first();
            assert.equal(updatedRevision.email_sent_count, 1);
        });

        it('supports recipients without a Mailgun message ID', async function () {
            const revision = await knex('automation_action_revisions').select('id').first();
            assert(revision);

            await repo.recordEmailSent({
                automationActionRevisionId: revision.id,
                memberEmail: 'member@example.com',
                memberId: 'member-id',
                memberName: null,
                memberUuid: '00000000-0000-4000-8000-000000000001',
                trackClicks: false,
                trackOpens: false
            });

            const recipient = await knex('automated_email_recipients').first();
            assert.equal(recipient.mailgun_message_id, null);
            assert.equal(recipient.member_name, null);
            assert.equal(recipient.track_clicks, 0);
            assert.equal(recipient.track_opens, 0);
        });
    });

    describe('getAutomatedEmailRecipientsByMailgunIds', function () {
        it('returns no recipients for no Mailgun message IDs', async function () {
            assert.deepEqual(await repo.getAutomatedEmailRecipientsByMailgunIds([]), []);
        });

        it('returns matching automated recipients', async function () {
            const revisions = await knex('automation_action_revisions')
                .select('id')
                .orderBy('id')
                .limit(2);
            const [firstRevision, secondRevision] = revisions;
            assert(firstRevision);
            assert(secondRevision);

            await knex('automated_email_recipients').insert([{
                id: 'matching-recipient-1',
                automation_action_revision_id: firstRevision.id,
                mailgun_message_id: 'matching-message-1'
            }, {
                id: 'matching-recipient-2',
                automation_action_revision_id: secondRevision.id,
                mailgun_message_id: 'matching-message-2'
            }, {
                id: 'non-automated-recipient',
                automation_action_revision_id: null,
                mailgun_message_id: 'other-message-3'
            }, {
                id: 'unmatched-recipient',
                automation_action_revision_id: firstRevision.id,
                mailgun_message_id: 'unmatched-message'
            }]);

            const recipients = await repo.getAutomatedEmailRecipientsByMailgunIds([
                'matching-message-1',
                'matching-message-2',
                'other-message-3'
            ]);

            assert.deepEqual(recipients.sort((left, right) => left.id.localeCompare(right.id)), [{
                id: 'matching-recipient-1',
                automation_action_revision_id: firstRevision.id,
                mailgun_message_id: 'matching-message-1'
            }, {
                id: 'matching-recipient-2',
                automation_action_revision_id: secondRevision.id,
                mailgun_message_id: 'matching-message-2'
            }]);
        });
    });

    describe('trackEmailDeliveredAndOpened', function () {
        const EARLIER = new Date('2026-01-01T00:00:00.000Z');
        const LATER = new Date('2026-02-02T00:00:00.000Z');

        let firstRevisionId: string;
        let secondRevisionId: string;

        // SQLite stores these datetime columns as millisecond timestamps.
        const toDateOrNull = (value: unknown): Date | null => (
            value === null ? null : new Date(value as number)
        );

        const getRecipient = async (id: string) => {
            const row = await knex('automated_email_recipients')
                .select('delivered_at', 'opened_at')
                .where('id', id)
                .first();
            assert(row, 'Expected recipient to exist');
            return {
                delivered_at: toDateOrNull(row.delivered_at),
                opened_at: toDateOrNull(row.opened_at)
            };
        };

        const getRecipients = async () => {
            const rows = await knex('automated_email_recipients')
                .select('id', 'delivered_at', 'opened_at')
                .orderBy('id');
            return rows.map(row => ({
                id: row.id,
                delivered_at: toDateOrNull(row.delivered_at),
                opened_at: toDateOrNull(row.opened_at)
            }));
        };

        const getOpenedCount = async (revisionId: string) => {
            const row = await knex('automation_action_revisions')
                .select('email_opened_count')
                .where('id', revisionId)
                .first();
            assert(row, 'Expected revision to exist');
            return row.email_opened_count;
        };

        beforeEach(async function () {
            const revisions = await knex('automation_action_revisions')
                .select('id')
                .orderBy('id')
                .limit(2);
            const [firstRevision, secondRevision] = revisions;
            assert(firstRevision);
            assert(secondRevision);
            firstRevisionId = firstRevision.id;
            secondRevisionId = secondRevision.id;

            await knex('automated_email_recipients').insert([{
                id: 'recipient-1',
                automation_action_revision_id: firstRevisionId,
                mailgun_message_id: 'mid1'
            }, {
                id: 'recipient-2',
                automation_action_revision_id: secondRevisionId,
                mailgun_message_id: 'mid2'
            }, {
                id: 'recipient-3',
                automation_action_revision_id: firstRevisionId,
                mailgun_message_id: 'mid3'
            }, {
                id: 'recipient-4',
                automation_action_revision_id: firstRevisionId,
                mailgun_message_id: 'mid4'
            }]);
        });

        const delivered = (deliveredAt: Date, automationActionRevisionId: string): AutomatedEmailEvents => ({
            deliveredAt,
            automationActionRevisionId
        });

        const open = (openedAt: Date, automationActionRevisionId: string): AutomatedEmailEvents => ({
            openedAt,
            automationActionRevisionId
        });

        const deliveredAndOpened = (
            deliveredAt: Date,
            openedAt: Date,
            automationActionRevisionId: string
        ): AutomatedEmailEvents => ({
            deliveredAt,
            openedAt,
            automationActionRevisionId
        });

        it('does nothing when there is nothing to track', async function () {
            await repo.trackEmailDeliveredAndOpened(new Map());

            assert.deepEqual(await getRecipients(), [{
                id: 'recipient-1',
                delivered_at: null,
                opened_at: null
            }, {
                id: 'recipient-2',
                delivered_at: null,
                opened_at: null
            }, {
                id: 'recipient-3',
                delivered_at: null,
                opened_at: null
            }, {
                id: 'recipient-4',
                delivered_at: null,
                opened_at: null
            }]);
            assert.equal(await getOpenedCount(firstRevisionId), null);
            assert.equal(await getOpenedCount(secondRevisionId), null);
        });

        it('tracks delivers and opens, leaving untouched recipients alone', async function () {
            await repo.trackEmailDeliveredAndOpened(new Map([
                ['recipient-1', delivered(EARLIER, firstRevisionId)],
                ['recipient-2', open(LATER, secondRevisionId)],
                ['recipient-3', deliveredAndOpened(EARLIER, LATER, firstRevisionId)]
            ]));

            assert.deepEqual(await getRecipients(), [{
                id: 'recipient-1',
                delivered_at: EARLIER,
                opened_at: null
            }, {
                id: 'recipient-2',
                delivered_at: null,
                opened_at: LATER
            }, {
                id: 'recipient-3',
                delivered_at: EARLIER,
                opened_at: LATER
            }, {
                id: 'recipient-4',
                delivered_at: null,
                opened_at: null
            }]);
        });

        it('keeps the earliest delivered and opened timestamps', async function () {
            await knex('automated_email_recipients')
                .where('id', 'recipient-3')
                .update({
                    delivered_at: EARLIER,
                    opened_at: EARLIER
                });

            await repo.trackEmailDeliveredAndOpened(new Map([
                ['recipient-3', deliveredAndOpened(LATER, LATER, firstRevisionId)]
            ]));

            assert.deepEqual(await getRecipient('recipient-3'), {
                delivered_at: EARLIER,
                opened_at: EARLIER
            });
            assert.equal(await getOpenedCount(firstRevisionId), null, 'a recipient that had already opened should not be counted again');
        });

        it('overwrites delivered and opened timestamps that are later than the new ones', async function () {
            await knex('automated_email_recipients')
                .where('id', 'recipient-3')
                .update({
                    delivered_at: LATER,
                    opened_at: LATER
                });

            await repo.trackEmailDeliveredAndOpened(new Map([
                ['recipient-3', deliveredAndOpened(EARLIER, EARLIER, firstRevisionId)]
            ]));

            assert.deepEqual(await getRecipient('recipient-3'), {
                delivered_at: EARLIER,
                opened_at: EARLIER
            });
            assert.equal(await getOpenedCount(firstRevisionId), null, 'correcting opened_at should not count the open again');
        });

        it('counts one open per recipient that opened', async function () {
            await repo.trackEmailDeliveredAndOpened(new Map([
                ['recipient-1', open(EARLIER, firstRevisionId)],
                ['recipient-3', open(LATER, firstRevisionId)],
                ['recipient-2', open(EARLIER, secondRevisionId)]
            ]));

            assert.equal(await getOpenedCount(firstRevisionId), 2);
            assert.equal(await getOpenedCount(secondRevisionId), 1);
        });

        it('counts a recipient only on its first open, however often it is tracked', async function () {
            const opens = new Map([['recipient-2', open(EARLIER, secondRevisionId)]]);

            await repo.trackEmailDeliveredAndOpened(opens);
            assert.equal(await getOpenedCount(secondRevisionId), 1);

            // The same open again, as an overlapping Mailgun fetch window would
            // deliver it.
            await repo.trackEmailDeliveredAndOpened(opens);
            assert.equal(await getOpenedCount(secondRevisionId), 1);
        });

        it('does not count a delivery as an open', async function () {
            await repo.trackEmailDeliveredAndOpened(new Map([
                ['recipient-1', delivered(EARLIER, firstRevisionId)]
            ]));

            assert.equal(await getOpenedCount(firstRevisionId), null);
        });

        it('adds to existing open counts, starting from zero when unset', async function () {
            await knex('automation_action_revisions')
                .where('id', secondRevisionId)
                .update({email_opened_count: 5});

            await repo.trackEmailDeliveredAndOpened(new Map([
                ['recipient-1', open(EARLIER, firstRevisionId)],
                ['recipient-2', open(EARLIER, secondRevisionId)]
            ]));

            assert.equal(await getOpenedCount(firstRevisionId), 1);
            assert.equal(await getOpenedCount(secondRevisionId), 6);
        });

        it('ignores unknown recipient IDs', async function () {
            await repo.trackEmailDeliveredAndOpened(new Map([
                ['does-not-exist', delivered(EARLIER, firstRevisionId)],
                ['does-not-exist-either', open(EARLIER, firstRevisionId)]
            ]));

            assert.equal(await getOpenedCount(firstRevisionId), null, 'an open for a recipient that does not exist should not be counted');
            assert.equal(await getOpenedCount(secondRevisionId), null);
        });
    });
});
