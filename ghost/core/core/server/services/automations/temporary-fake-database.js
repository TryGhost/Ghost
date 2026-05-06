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

/**
 * @returns {import('node:sqlite').DatabaseSync}
 */
function createTemporaryFakeAutomationsDatabase() {
    const {DatabaseSync} = require('node:sqlite');

    const database = new DatabaseSync(':memory:');

    database.exec(`
CREATE TABLE automations (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL
) STRICT;

CREATE TABLE automation_actions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  automation_id TEXT NOT NULL REFERENCES automations(id),
  type TEXT NOT NULL
) STRICT;

CREATE TABLE automation_action_revisions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
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

CREATE TABLE action_edges (
  source_action_id TEXT NOT NULL REFERENCES automation_actions(id),
  target_action_id TEXT NOT NULL REFERENCES automation_actions(id),
  PRIMARY KEY (source_action_id, target_action_id)
) STRICT;

CREATE TABLE automation_runs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  automation_id TEXT NOT NULL REFERENCES automations(id),
  member_id TEXT, -- not a real foreign key here
  member_email TEXT NOT NULL
) STRICT;

CREATE TABLE automation_run_steps (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  automation_run_id TEXT NOT NULL REFERENCES automation_runs(id),
  automation_action_revision_id TEXT NOT NULL REFERENCES automation_action_revisions(id),
  ready_at INTEGER NOT NULL,
  step_attempts INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  status TEXT NOT NULL,
  locked_by TEXT,
  locked_at INTEGER
) STRICT;

INSERT INTO automations (id, created_at, updated_at, slug, name, status) VALUES
('auto_free_01', 1715016000, 1715016000, 'member-welcome-email-free', 'Welcome Email (Free)', 'active'),
('auto_paid_01', 1715016000, 1715016000, 'member-welcome-email-paid', 'Welcome Email (Paid)', 'active');

INSERT INTO automation_actions (id, created_at, updated_at, automation_id, type) VALUES
('f_act_1', 1715016000, 1715016000, 'auto_free_01', 'wait'),
('f_act_2', 1715016000, 1715016000, 'auto_free_01', 'send email'),
('f_act_3', 1715016000, 1715016000, 'auto_free_01', 'wait'),
('f_act_4', 1715016000, 1715016000, 'auto_free_01', 'send email');

INSERT INTO automation_actions (id, created_at, updated_at, automation_id, type) VALUES
('p_act_1', 1715016000, 1715016000, 'auto_paid_01', 'wait'),
('p_act_2', 1715016000, 1715016000, 'auto_paid_01', 'send email'),
('p_act_3', 1715016000, 1715016000, 'auto_paid_01', 'wait'),
('p_act_4', 1715016000, 1715016000, 'auto_paid_01', 'send email');

INSERT INTO automation_action_revisions (id, created_at, action_id, wait_hours, email_subject, email_lexical) VALUES
('f_rev_1', 1715016001, 'f_act_1', 48, NULL, NULL),
('f_rev_2', 1715016002, 'f_act_2', NULL, 'Welcome!', '{"root":{"children":[]}}'),
('f_rev_3', 1715016003, 'f_act_3', 72, NULL, NULL),
('f_rev_4', 1715016004, 'f_act_4', NULL, 'Follow up', '{"root":{"children":[]}}'),
('p_rev_1', 1715016005, 'p_act_1', 48, NULL, NULL),
('p_rev_2', 1715016006, 'p_act_2', NULL, 'Welcome to Paid!', '{"root":{"children":[]}}'),
('p_rev_3', 1715016007, 'p_act_3', 72, NULL, NULL),
('p_rev_4', 1715016008, 'p_act_4', NULL, 'Exclusive Insights', '{"root":{"children":[]}}');

INSERT INTO action_edges (source_action_id, target_action_id) VALUES
('f_act_1', 'f_act_2'),
('f_act_2', 'f_act_3'),
('f_act_3', 'f_act_4'),
('p_act_1', 'p_act_2'),
('p_act_2', 'p_act_3'),
('p_act_3', 'p_act_4');
`);

    return database;
}

exports.temporaryFakeAutomationsDatabase = process.env.NODE_ENV === 'development' ? createTemporaryFakeAutomationsDatabase() : null;
