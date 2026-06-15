/**
 * This is a temporary fake database that we're using to test automations in
 * development.
 *
 * We intend to delete this file by June 2026, if not sooner. See
 * TODO(NY-1260). If we haven't deleted this for months, something has gone
 * wrong with our plan!
 *
 * This approach will be easier to iterate on. We'll "commit" these as a real
 * migration once we're sure this schema is correct.
 */

import * as errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import knex, {type Knex} from 'knex';

export async function createTemporaryFakeAutomationsDatabase(): Promise<Knex> {
    const database = knex({
        client: 'sqlite3',
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
    const now = () => new Date().toISOString();

    const fakeLexical = JSON.stringify({
        root: {
            children: [{
                type: 'paragraph',
                children: [{
                    type: 'text',
                    text: 'Lorem ipsum.'
                }]
            }],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
    const fakeEmailDesignSettingId = id();

    await database.schema.createTable('automations', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('slug').notNullable();
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

    await database.schema.createTable('automation_action_revisions', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('action_id').notNullable().references('id').inTable('automation_actions');
        table.integer('wait_hours');
        table.text('email_subject');
        table.text('email_lexical');
        table.text('email_design_setting_id'); // not a real foreign key here
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

    const freeAutomationId = id();
    const paidAutomationId = id();
    await database('automations').insert([{
        id: freeAutomationId,
        created_at: now(),
        updated_at: now(),
        slug: 'member-welcome-email-free',
        name: 'Welcome Email (Free)',
        status: 'active'
    }, {
        id: paidAutomationId,
        created_at: now(),
        updated_at: now(),
        slug: 'member-welcome-email-paid',
        name: 'Welcome Email (Paid)',
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
        email_lexical: fakeLexical,
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
        email_lexical: fakeLexical,
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
        email_lexical: fakeLexical,
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
        email_lexical: fakeLexical,
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
}

let cachedDatabase: Knex | null = null;

export async function getTemporaryFakeAutomationsDatabase(): Promise<Knex> {
    if (process.env.NODE_ENV !== 'development') {
        throw new errors.IncorrectUsageError({
            message: 'Fake automations database should only be used in development'
        });
    }
    cachedDatabase ??= await createTemporaryFakeAutomationsDatabase();
    return cachedDatabase;
}
