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

const errors = require('@tryghost/errors');
const ObjectId = require('bson-objectid').default;

/**
 * @returns {import('node:sqlite').DatabaseSync}
 */
function createTemporaryFakeAutomationsDatabase() {
    const {DatabaseSync} = require('node:sqlite');

    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON;');

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

    database.exec(`
CREATE TABLE automations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL
) STRICT;

CREATE TABLE automation_actions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  automation_id TEXT NOT NULL REFERENCES automations(id),
  type TEXT NOT NULL
) STRICT;

CREATE TABLE automation_action_revisions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  action_id TEXT NOT NULL REFERENCES automation_actions(id),
  wait_hours INTEGER,
  email_subject TEXT,
  email_lexical TEXT,
  email_sender_name TEXT,
  email_sender_email TEXT,
  email_sender_reply_to TEXT,
  email_design_setting_id TEXT, -- not a real foreign key here
  UNIQUE (created_at, action_id)
) STRICT;

CREATE TABLE automation_action_edges (
  source_action_id TEXT NOT NULL REFERENCES automation_actions(id),
  target_action_id TEXT NOT NULL REFERENCES automation_actions(id),
  PRIMARY KEY (source_action_id, target_action_id)
) STRICT;

CREATE TABLE automation_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  automation_id TEXT NOT NULL REFERENCES automations(id),
  member_id TEXT, -- not a real foreign key here
  member_email TEXT NOT NULL
) STRICT;

CREATE TABLE automation_run_steps (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  automation_run_id TEXT NOT NULL REFERENCES automation_runs(id),
  automation_action_revision_id TEXT NOT NULL REFERENCES automation_action_revisions(id),
  ready_at TEXT NOT NULL,
  step_attempts INTEGER NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  status TEXT NOT NULL,
  locked_by TEXT,
  locked_at TEXT
) STRICT;
`);

    const freeAutomationId = id();
    const paidAutomationId = id();
    const insertAutomation = database.prepare(`
        INSERT INTO automations
        (id, created_at, updated_at, slug, name, status) VALUES
        (:id, :created_at, :updated_at, :slug, :name, :status)
    `);
    insertAutomation.run({
        id: freeAutomationId,
        created_at: now(),
        updated_at: now(),
        slug: 'member-welcome-email-free',
        name: 'Welcome Email (Free)',
        status: 'active'
    });
    insertAutomation.run({
        id: paidAutomationId,
        created_at: now(),
        updated_at: now(),
        slug: 'member-welcome-email-paid',
        name: 'Welcome Email (Paid)',
        status: 'active'
    });

    const freeAction1Id = id();
    const freeAction2Id = id();
    const freeAction3Id = id();
    const freeAction4Id = id();
    const paidAction1Id = id();
    const paidAction2Id = id();
    const paidAction3Id = id();
    const paidAction4Id = id();
    const insertAction = database.prepare(`
        INSERT INTO automation_actions
        (id, created_at, updated_at, automation_id, type) VALUES
        (:id, :created_at, :updated_at, :automation_id, :type)
    `);
    insertAction.run({
        id: freeAction1Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'wait'
    });
    insertAction.run({
        id: freeAction2Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'send email'
    });
    insertAction.run({
        id: freeAction3Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'wait'
    });
    insertAction.run({
        id: freeAction4Id,
        created_at: now(),
        updated_at: now(),
        automation_id: freeAutomationId,
        type: 'send email'
    });
    insertAction.run({
        id: paidAction1Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'wait'
    });
    insertAction.run({
        id: paidAction2Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'send email'
    });
    insertAction.run({
        id: paidAction3Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'wait'
    });
    insertAction.run({
        id: paidAction4Id,
        created_at: now(),
        updated_at: now(),
        automation_id: paidAutomationId,
        type: 'send email'
    });

    const insertActionRevision = database.prepare(`
        INSERT INTO automation_action_revisions
        (id, created_at, action_id, wait_hours, email_subject, email_lexical, email_design_setting_id) VALUES
        (:id, :created_at, :action_id, :wait_hours, :email_subject, :email_lexical, :email_design_setting_id)
    `);
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: freeAction1Id,
        wait_hours: 48,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: freeAction2Id,
        wait_hours: null,
        email_subject: 'Welcome!',
        email_lexical: fakeLexical,
        email_design_setting_id: fakeEmailDesignSettingId
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: freeAction3Id,
        wait_hours: 72,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: freeAction4Id,
        wait_hours: null,
        email_subject: 'Follow up',
        email_lexical: fakeLexical,
        email_design_setting_id: fakeEmailDesignSettingId
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: paidAction1Id,
        wait_hours: 48,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: paidAction2Id,
        wait_hours: null,
        email_subject: 'Welcome to Paid!',
        email_lexical: fakeLexical,
        email_design_setting_id: fakeEmailDesignSettingId
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: paidAction3Id,
        wait_hours: 72,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    });
    insertActionRevision.run({
        id: id(),
        created_at: now(),
        action_id: paidAction4Id,
        wait_hours: null,
        email_subject: 'Exclusive Insights',
        email_lexical: fakeLexical,
        email_design_setting_id: fakeEmailDesignSettingId
    });

    const insertActionEdge = database.prepare(`
        INSERT INTO automation_action_edges
        (source_action_id, target_action_id) VALUES
        (:source_action_id, :target_action_id)
    `);
    insertActionEdge.run({
        source_action_id: freeAction1Id,
        target_action_id: freeAction2Id
    });
    insertActionEdge.run({
        source_action_id: freeAction2Id,
        target_action_id: freeAction3Id
    });
    insertActionEdge.run({
        source_action_id: freeAction3Id,
        target_action_id: freeAction4Id
    });
    insertActionEdge.run({
        source_action_id: paidAction1Id,
        target_action_id: paidAction2Id
    });
    insertActionEdge.run({
        source_action_id: paidAction2Id,
        target_action_id: paidAction3Id
    });
    insertActionEdge.run({
        source_action_id: paidAction3Id,
        target_action_id: paidAction4Id
    });

    return database;
}

/** @type {null | import('node:sqlite').DatabaseSync} */
let cachedDatabase = null;

/**
 * @returns {import('node:sqlite').DatabaseSync}
 */
function getTemporaryFakeAutomationsDatabase() {
    if (process.env.NODE_ENV !== 'development') {
        throw new errors.IncorrectUsageError({
            message: 'Fake automations database should only be used in development'
        });
    }
    cachedDatabase ??= createTemporaryFakeAutomationsDatabase();
    return cachedDatabase;
}

exports.createTemporaryFakeAutomationsDatabase = createTemporaryFakeAutomationsDatabase;
exports.getTemporaryFakeAutomationsDatabase = getTemporaryFakeAutomationsDatabase;
