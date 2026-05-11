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

const {default: ObjectID} = require('bson-objectid');

/**
 * @returns {import('node:sqlite').DatabaseSync}
 */
function createTemporaryFakeAutomationsDatabase() {
    const {DatabaseSync} = require('node:sqlite');

    const database = new DatabaseSync(':memory:');
    const automationEmailLexical = {
        freeWelcome: createLexicalDocument([
            'Welcome to The Daily Dispatch. You are now on the free list, so you will get our weekly editor notes, public essays, and product updates.',
            'Start with the latest highlights in the archive, then reply to any email when there is a topic you want us to cover next.'
        ]),
        freeFollowUp: createLexicalDocument([
            'It has been a few days since you joined, so here are three reader favorites to help you get settled in.',
            'If you like the free issues, paid members also receive Friday deep dives, private comments, and early access to new guides.'
        ]),
        paidWelcome: createLexicalDocument([
            'Thank you for becoming a paid member. Your subscription keeps the publication independent and gives you access to every members-only issue.',
            'You can read the full archive now, join the private discussion on new posts, and expect the first paid briefing in your inbox this week.'
        ]),
        paidInsights: createLexicalDocument([
            'This week for paid members: a behind-the-scenes breakdown of the research process, the charts we did not publish, and what we are watching next.',
            'Send us your questions before Friday and we will include the best ones in the next member briefing.'
        ])
    };
    const fakeEmailDesignSettingId = new ObjectID().toHexString();

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

CREATE TABLE automation_action_edges (
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
('670000000000000000000001', 1715016000, 1715016000, 'member-welcome-email-free', 'Welcome Email (Free)', 'active'),
('670000000000000000000002', 1715016000, 1715016000, 'member-welcome-email-paid', 'Welcome Email (Paid)', 'active');

INSERT INTO automation_actions (id, created_at, updated_at, automation_id, type) VALUES
('670000000000000000000011', 1715016000, 1715016000, '670000000000000000000001', 'wait'),
('670000000000000000000012', 1715016000, 1715016000, '670000000000000000000001', 'send email'),
('670000000000000000000013', 1715016000, 1715016000, '670000000000000000000001', 'wait'),
('670000000000000000000014', 1715016000, 1715016000, '670000000000000000000001', 'send email');

INSERT INTO automation_actions (id, created_at, updated_at, automation_id, type) VALUES
('670000000000000000000021', 1715016000, 1715016000, '670000000000000000000002', 'wait'),
('670000000000000000000022', 1715016000, 1715016000, '670000000000000000000002', 'send email'),
('670000000000000000000023', 1715016000, 1715016000, '670000000000000000000002', 'wait'),
('670000000000000000000024', 1715016000, 1715016000, '670000000000000000000002', 'send email');

INSERT INTO automation_action_revisions (id, created_at, action_id, wait_hours, email_subject, email_lexical, email_design_setting_id) VALUES
('670000000000000000000111', 1715016001, '670000000000000000000011', 48, NULL, NULL, NULL),
('670000000000000000000112', 1715016002, '670000000000000000000012', NULL, 'Welcome to The Daily Dispatch', '${automationEmailLexical.freeWelcome}', '${fakeEmailDesignSettingId}'),
('670000000000000000000113', 1715016003, '670000000000000000000013', 72, NULL, NULL, NULL),
('670000000000000000000114', 1715016004, '670000000000000000000014', NULL, 'A few reader favorites to get you started', '${automationEmailLexical.freeFollowUp}', '${fakeEmailDesignSettingId}'),
('670000000000000000000121', 1715016005, '670000000000000000000021', 48, NULL, NULL, NULL),
('670000000000000000000122', 1715016006, '670000000000000000000022', NULL, 'Welcome, paid member', '${automationEmailLexical.paidWelcome}', '${fakeEmailDesignSettingId}'),
('670000000000000000000123', 1715016007, '670000000000000000000023', 72, NULL, NULL, NULL),
('670000000000000000000124', 1715016008, '670000000000000000000024', NULL, 'This week''s member briefing', '${automationEmailLexical.paidInsights}', '${fakeEmailDesignSettingId}');

INSERT INTO automation_action_edges (source_action_id, target_action_id) VALUES
('670000000000000000000011', '670000000000000000000012'),
('670000000000000000000012', '670000000000000000000013'),
('670000000000000000000013', '670000000000000000000014'),
('670000000000000000000021', '670000000000000000000022'),
('670000000000000000000022', '670000000000000000000023'),
('670000000000000000000023', '670000000000000000000024');
`);

    return database;
}

/**
 * @param {string[]} paragraphs
 * @returns {string}
 */
function createLexicalDocument(paragraphs) {
    return JSON.stringify({
        root: {
            children: paragraphs.map((/** @type {string} */ text) => ({
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text,
                        type: 'text',
                        version: 1
                    }
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            })),
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
}

/** @type {import('node:sqlite').DatabaseSync | null} */
let cachedDatabase = null;

/**
 * Returns the singleton fake automations database, lazily initializing it on
 * first call. Returns null in production where this fake database must never
 * be used.
 *
 * @returns {import('node:sqlite').DatabaseSync | null}
 */
function getTemporaryFakeAutomationsDatabase() {
    if (cachedDatabase) {
        return cachedDatabase;
    }
    if (process.env.NODE_ENV === 'production') {
        return null;
    }
    cachedDatabase = createTemporaryFakeAutomationsDatabase();
    return cachedDatabase;
}

exports.createTemporaryFakeAutomationsDatabase = createTemporaryFakeAutomationsDatabase;
exports.getTemporaryFakeAutomationsDatabase = getTemporaryFakeAutomationsDatabase;
