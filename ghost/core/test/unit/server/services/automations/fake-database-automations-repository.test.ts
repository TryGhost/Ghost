import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ObjectId from 'bson-objectid';
import {createFakeDatabaseAutomationsRepository} from '../../../../../core/server/services/automations/fake-database-automations-repository';
import type {Automation, AutomationAction} from '../../../../../core/server/services/automations/automations-repository';

const now = '2026-01-01T00:00:00.000Z';
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

function id() {
    return ObjectId().toString();
}

function insertRevision(database: DatabaseSync, revision: {
    action_id: string;
    wait_hours: number | null;
    email_subject: string | null;
    email_lexical: string | null;
    email_sender_name: string | null;
    email_sender_email: string | null;
    email_sender_reply_to: string | null;
    email_design_setting_id: string | null;
}) {
    database.prepare(`
        INSERT INTO automation_action_revisions
        (
            id,
            created_at,
            action_id,
            wait_hours,
            email_subject,
            email_lexical,
            email_sender_name,
            email_sender_email,
            email_sender_reply_to,
            email_design_setting_id
        ) VALUES (
            :id,
            :created_at,
            :action_id,
            :wait_hours,
            :email_subject,
            :email_lexical,
            :email_sender_name,
            :email_sender_email,
            :email_sender_reply_to,
            :email_design_setting_id
        )
    `).run({
        id: id(),
        created_at: now,
        ...revision
    });
}

function createDatabase() {
    const database = new DatabaseSync(':memory:');
    const automationId = id();
    const waitActionId = id();
    const emailActionId = id();

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
  email_design_setting_id TEXT,
  UNIQUE (created_at, action_id)
) STRICT;

CREATE TABLE automation_action_edges (
  source_action_id TEXT NOT NULL REFERENCES automation_actions(id),
  target_action_id TEXT NOT NULL REFERENCES automation_actions(id),
  PRIMARY KEY (source_action_id, target_action_id)
) STRICT;
`);

    database.prepare(`
        INSERT INTO automations
        (id, created_at, updated_at, slug, name, status) VALUES
        (:id, :created_at, :updated_at, :slug, :name, :status)
    `).run({
        id: automationId,
        created_at: now,
        updated_at: now,
        slug: 'test-automation',
        name: 'Test Automation',
        status: 'active'
    });

    database.prepare(`
        INSERT INTO automation_actions
        (id, created_at, updated_at, automation_id, type) VALUES
        (:id, :created_at, :updated_at, :automation_id, :type)
    `).run({
        id: waitActionId,
        created_at: now,
        updated_at: now,
        automation_id: automationId,
        type: 'wait'
    });

    database.prepare(`
        INSERT INTO automation_actions
        (id, created_at, updated_at, automation_id, type) VALUES
        (:id, :created_at, :updated_at, :automation_id, :type)
    `).run({
        id: emailActionId,
        created_at: now,
        updated_at: now,
        automation_id: automationId,
        type: 'send_email'
    });

    insertRevision(database, {
        action_id: waitActionId,
        wait_hours: 24,
        email_subject: null,
        email_lexical: null,
        email_sender_name: null,
        email_sender_email: null,
        email_sender_reply_to: null,
        email_design_setting_id: null
    });

    insertRevision(database, {
        action_id: emailActionId,
        wait_hours: null,
        email_subject: 'Welcome',
        email_lexical: emailLexical,
        email_sender_name: 'Sender',
        email_sender_email: null,
        email_sender_reply_to: 'reply@example.com',
        email_design_setting_id: id()
    });

    database.prepare(`
        INSERT INTO automation_action_edges
        (source_action_id, target_action_id) VALUES
        (:source_action_id, :target_action_id)
    `).run({
        source_action_id: waitActionId,
        target_action_id: emailActionId
    });

    return {database, automationId, waitActionId, emailActionId};
}

function countRevisions(database: DatabaseSync, actionId?: string) {
    const row = actionId
        ? database.prepare('SELECT COUNT(*) AS count FROM automation_action_revisions WHERE action_id = ?').get(actionId)
        : database.prepare('SELECT COUNT(*) AS count FROM automation_action_revisions').get();

    return Number((row as {count: number}).count);
}

function requireAutomation(automation: Automation | null): Automation {
    assert.ok(automation);
    return automation;
}

function changeWaitHours(action: AutomationAction, waitHours: number): AutomationAction {
    assert.equal(action.type, 'wait');
    return {
        ...action,
        data: {
            wait_hours: waitHours
        }
    };
}

describe('FakeDatabaseAutomationsRepository', function () {
    it('only inserts action revisions when action data changes', async function () {
        const {database, automationId, waitActionId, emailActionId} = createDatabase();
        const repository = createFakeDatabaseAutomationsRepository({
            getDatabase: () => database
        });

        const initialAutomation = requireAutomation(await repository.getById(automationId));
        assert.equal(countRevisions(database), 2);

        await repository.edit(automationId, {
            status: 'inactive',
            actions: initialAutomation.actions,
            edges: initialAutomation.edges
        });

        assert.equal(countRevisions(database), 2);
        assert.equal(countRevisions(database, waitActionId), 1);
        assert.equal(countRevisions(database, emailActionId), 1);

        const unchangedEmailAction = initialAutomation.actions.find(action => action.id === emailActionId);
        const changedWaitAction = changeWaitHours(initialAutomation.actions.find(action => action.id === waitActionId) as AutomationAction, 48);
        assert.ok(unchangedEmailAction);

        await repository.edit(automationId, {
            status: 'inactive',
            actions: [changedWaitAction, unchangedEmailAction],
            edges: initialAutomation.edges
        });

        assert.equal(countRevisions(database), 3);
        assert.equal(countRevisions(database, waitActionId), 2);
        assert.equal(countRevisions(database, emailActionId), 1);

        const addedActionId = id();
        const addedAction: AutomationAction = {
            id: addedActionId,
            type: 'wait',
            data: {
                wait_hours: 72
            }
        };

        await repository.edit(automationId, {
            status: 'inactive',
            actions: [changedWaitAction, unchangedEmailAction, addedAction],
            edges: [
                ...initialAutomation.edges,
                {
                    source_action_id: emailActionId,
                    target_action_id: addedActionId
                }
            ]
        });

        assert.equal(countRevisions(database), 4);
        assert.equal(countRevisions(database, waitActionId), 2);
        assert.equal(countRevisions(database, emailActionId), 1);
        assert.equal(countRevisions(database, addedActionId), 1);
    });
});
