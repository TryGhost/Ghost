const assert = require('node:assert/strict');
const papaparse = require('papaparse');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const configUtils = require('../../utils/config-utils');
const config = require('../../../core/shared/config');
const jobsService = require('../../../core/server/services/jobs');
const { mockManager } = require('../../utils/e2e-framework');

// The error report a failed import emails back to the manager: one importable row (so
// the run reports as a completion), then rows failing for the distinct reasons a manager
// sees. The header row carries a formula-shaped name (to hold the line on escaping), an
// import-only column that is not echoed (import_tier), and a custom field column that is
// echoed so a manager can fix and re-upload the values they mapped (custom_fields.color).
const CSV = [
  'email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,labels,import_tier,gift_id,custom_fields.color',
  'valid+ok@example.com,Good Member,,false,,,,,,,',
  'not-a-valid-email,=1+2,A note,true,false,,,"Label A,Label B",Gold,,blue',
  ',No Email,,false,,,,,,,',
  'bad-tier@example.com,Tier Person,,true,,,,,Nonexistent Tier,,',
].join('\n');

// The fixed member vocabulary, then the submitted custom field columns, then the error
// column last. custom_fields.* columns are threaded in before error so a re-upload of the
// fixed rows carries their values back; import_tier and other input columns are not.
const EXPECTED_COLUMNS = [
  'id',
  'email',
  'name',
  'note',
  'subscribed_to_emails',
  'complimentary_plan',
  'stripe_customer_id',
  'created_at',
  'deleted_at',
  'labels',
  'tiers',
  'gift_id',
  'custom_fields.color',
  'error',
];

describe('Members import error report', function () {
  let request;
  let columns;
  let rows;

  beforeAll(async function () {
    await localUtils.startGhost();
    request = supertest.agent(config.get('url'));
    await localUtils.doAuth(request, 'newsletters', 'members:newsletters');

    mockManager.mockMail();
    // Force the deferred path: over the threshold, the import is handed to a
    // background job that emails the report as an attached CSV.
    configUtils.set('members:importer:inlineThreshold', 1);

    const res = await request
      .post(localUtils.API.getApiQuery('members/upload/'))
      .attach('membersfile', Buffer.from(CSV), { filename: 'members.csv', contentType: 'text/csv' })
      .set('Origin', config.get('url'))
      .expect('Content-Type', /json/)
      .expect('Cache-Control', testUtils.cacheRules.private);
    assert.equal(res.status, 202, 'over the threshold the import defers');

    // The job reports by email and must finish inside the test: the mail mock is
    // torn down before the framework settles jobs.
    await jobsService.allSettled();

    const email = mockManager.assert.sentEmail({ subject: 'Your member import is complete' });
    assert.ok(
      email.attachments && email.attachments[0],
      'the completion email carries an attachment',
    );
    assert.match(email.attachments[0].filename, / - Errors\.csv$/);
    assert.equal(email.attachments[0].contentType, 'text/csv');

    const parsed = papaparse.parse(email.attachments[0].content.trim(), { header: true });
    columns = parsed.meta.fields;
    rows = parsed.data;
  });

  afterAll(async function () {
    mockManager.restore();
    await configUtils.restore();
  });

  const rowFor = (email) => rows.find((row) => row.email === email);

  it('emits the member-vocabulary columns and the submitted custom field columns', function () {
    assert.deepEqual(columns, EXPECTED_COLUMNS);
  });

  it('carries submitted custom field columns but not other input columns', function () {
    // The report echoes the member vocabulary and the custom field columns a row
    // carried, so a manager can fix the failed rows and re-upload their values.
    // import_tier is an input the report resolves rather than echoes, so it is not.
    assert.ok(!columns.includes('import_tier'), 'no import_tier column');
    assert.ok(
      columns.includes('custom_fields.color'),
      'the submitted custom field column is echoed',
    );
    assert.equal(
      rowFor('not-a-valid-email')['custom_fields.color'],
      'blue',
      'its value is echoed on the failed row',
    );
  });

  it('keeps the tiers column present but empty', function () {
    assert.ok(columns.includes('tiers'), 'tiers column is present');
    assert.ok(
      rows.every((row) => row.tiers === ''),
      'tiers is empty for every failed row',
    );
  });

  it('reports only the failed rows, not the importable one', function () {
    assert.equal(rows.length, 3);
    assert.equal(rowFor('valid+ok@example.com'), undefined, 'the row that imported is absent');
  });

  it('echoes the submitted fields of a failed row, escaping formulas', function () {
    const row = rowFor('not-a-valid-email');
    assert.ok(row, 'the invalid-email row is reported');
    // A leading = would be read as a formula by a spreadsheet, so it is escaped.
    assert.equal(row.name, "'=1+2");
    assert.equal(row.labels, 'Label A,Label B');
    assert.equal(row.subscribed_to_emails, 'true');
    assert.match(row.error, /Invalid Email/i);
  });

  it('reports the reason each row failed', function () {
    assert.match(rowFor('bad-tier@example.com').error, /is not a valid tier/);

    const blank = rows.find((row) => row.email === '' && row.name === 'No Email');
    assert.ok(blank, 'the blank-email row is reported');
    assert.ok(blank.error.length > 0, 'it carries a failure reason');
  });
});
