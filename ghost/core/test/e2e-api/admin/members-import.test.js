const path = require('path');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const configUtils = require('../../utils/config-utils');
const models = require('../../../core/server/models');
const jobsService = require('../../../core/server/services/jobs');
const {assertExists} = require('../../utils/assertions');
const {mockManager} = require('../../utils/e2e-framework');

// The members CSV import behaviour, exercised at the API boundary: the responses it
// returns and the outcomes it leaves behind (members, labels, subscriptions, the
// deferred completion email). This is the canonical spec for the importer.
const fixture = name => path.join(__dirname, '/../../utils/fixtures/csv/', name);

describe('Members import', function () {
    let request;
    let subscribeOnSignupCount;

    beforeAll(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'newsletters', 'members:newsletters');

        // A subscribed new member is added to every subscribe-on-signup newsletter,
        // so the expected newsletter count for a subscribed import is this many.
        const newsletters = (await models.Newsletter.findAll({filter: 'status:active'})).models;
        subscribeOnSignupCount = newsletters.filter(n => n.get('subscribe_on_signup')).length;
        assert.ok(subscribeOnSignupCount > 0, 'needs at least one subscribe_on_signup newsletter fixture');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(async function () {
        mockManager.restore();
        await configUtils.restore();
    });

    const findMember = async (email) => {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(email)}`))
            .set('Origin', config.get('url'))
            .expect(200);
        return res.body.members.find(m => m.email === email);
    };

    const upload = file => request
        .post(localUtils.API.getApiQuery('members/upload/'))
        .attach('membersfile', fixture(file))
        .set('Origin', config.get('url'))
        .expect('Content-Type', /json/)
        .expect('Cache-Control', testUtils.cacheRules.private);

    it('imports a valid file inline and reports its stats', async function () {
        const res = await upload('valid-members-import.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.originalImportSize, 2);
        assert.equal(res.body.meta.stats.imported, 2);
        assert.equal(res.body.meta.stats.invalid.length, 0);
        assert.match(res.body.meta.import_label.name, /^Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('defers a file carrying Stripe data and returns no stats', async function () {
        const res = await upload('members-with-stripe-ids.csv');

        assert.equal(res.status, 202);
        assert.equal(res.body.meta.stats, undefined);
    });

    it('accepts a headers-only file as nothing imported', async function () {
        const res = await upload('members-headers-only.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.originalImportSize, 0);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.deepEqual(res.body.meta.stats.invalid, []);
    });

    it('preserves columns from an uneven file so every row imports', async function () {
        const res = await upload('members-ragged-row.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 2);
        assert.equal(res.body.meta.stats.invalid.length, 0);
    });

    it('applies the labels from a labels column', async function () {
        const importRes = await upload('valid-members-labels.csv');
        assert.equal(importRes.status, 201);
        assert.equal(importRes.body.meta.stats.imported, 2);

        const member = await findMember('member+labels_1@example.com');
        assertExists(member);
        const labels = member.labels.map(l => l.name);
        assert.ok(labels.includes('label'), `expected 'label' in ${JSON.stringify(labels)}`);
    });

    // A row that omits a trailing column parses to a missing cell. The value reported
    // for that cell must match how a present-but-empty cell coerces: subscribed reads
    // as true. Here the ragged row also fails (bad email), so the coerced value
    // surfaces in the invalid list.
    it('reports a missing subscribed cell on a ragged row as the coerced default', async function () {
        const res = await upload('members-ragged-subscribed.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.equal(res.body.meta.stats.invalid[0].subscribed, true);
    });

    // When two CSV columns map to the same member field, the last column in the row
    // wins. Here the first (Email) is empty and the second (email_addr) holds the
    // address, so the member must import off email_addr.
    it('lets the last column win when two headers map to the same field', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .field('mapping[Email]', 'email')
            .field('mapping[email_addr]', 'email')
            .attach('membersfile', fixture('members-duplicate-mapping.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 0);
    });

    // The imported members exist with their fields, subscription state and the auto
    // import label. Assertions read each member by email so they hold whether the row
    // created the member or updated one imported by an earlier test.
    it('creates members with their fields, subscription and import label', async function () {
        const res = await upload('valid-members-import.csv');

        assert.equal(res.status, 201);
        assert.equal(res.headers['x-cache-invalidate'], undefined);
        assert.equal(res.body.meta.stats.imported, 2);
        assert.match(res.body.meta.import_label.slug, /^import-/);
        const labelName = res.body.meta.import_label.name;

        const m1 = await findMember('jbloggs@example.com');
        assertExists(m1);
        assert.equal(m1.name, 'joe');
        assert.equal(m1.note, null);
        assert.equal(m1.subscribed, true);
        assert.equal(m1.newsletters.length, subscribeOnSignupCount);
        assert.equal(m1.comped, false);
        assert.equal(m1.subscriptions.length, 0);
        assert.ok(m1.labels.map(l => l.name).includes(labelName), 'member carries the import label');

        const m2 = await findMember('test@example.com');
        assertExists(m2);
        assert.equal(m2.name, 'test');
        assert.equal(m2.note, 'test note');
        assert.equal(m2.subscribed, false);
        assert.equal(m2.newsletters.length, 0);
        assert.equal(m2.comped, false);
        assert.equal(m2.subscriptions.length, 0);
        assert.equal(m2.created_at, '1991-10-02T20:30:31.000Z');
    });

    // A mixed file imports the good rows and reports the bad ones with a reason.
    it('imports valid rows and reports invalid ones with a reason', async function () {
        const res = await upload('members-invalid-values.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);
        assert.equal(res.body.meta.stats.invalid.length, 2);
        assert.match(res.body.meta.stats.invalid[0].error, /Invalid Email/);
        assert.match(res.body.meta.stats.invalid[1].error, /Invalid Email/);
    });

    // A custom header mapping routes non-standard columns to member fields.
    it('imports a member through a custom header mapping', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .field('mapping[correo_electrpnico]', 'email')
            .field('mapping[nombre]', 'name')
            .field('mapping[note]', 'note')
            .attach('membersfile', fixture('members-with-mappings.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/);

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember('member+mapped_1@example.com');
        assertExists(member);
        assert.equal(member.name, 'Hannah');
        assert.equal(member.note, 'do map me');
    });

    // A form label containing a comma is one label, while a row label containing a
    // comma is split on the comma -- the two arrive through different channels.
    it('keeps a form label with a comma whole but splits a row label on commas', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .field('labels', ['Bristol, UK'])
            .attach('membersfile', fixture('valid-members-labels.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/);

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 2);

        const formLabelled = await findMember('member+labels_1@example.com');
        assertExists(formLabelled);
        const names1 = formLabelled.labels.map(l => l.name);
        assert.ok(names1.includes('Bristol, UK'), `form label kept whole, got ${JSON.stringify(names1)}`);
        assert.equal(names1.includes('Bristol'), false, 'form label must not split');

        const rowLabelled = await findMember('member+labels_2@example.com');
        assertExists(rowLabelled);
        const names2 = rowLabelled.labels.map(l => l.name);
        assert.ok(names2.includes('another-label'), `row label split, got ${JSON.stringify(names2)}`);
        assert.ok(names2.includes('and-one-more'), `row label split, got ${JSON.stringify(names2)}`);
    });

    // A created_at in the future is clamped to no later than now.
    it('clamps a future created_at to now', async function () {
        const res = await upload('members-future-created-at.csv');
        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 1);

        const member = await findMember('member+future@example.com');
        assertExists(member);
        assert.ok(new Date(member.created_at) <= new Date(), 'created_at must not be in the future');
        assert.notEqual(new Date(member.created_at).getUTCFullYear(), 9999);
    });

    // A gift row cannot also carry an import tier or complimentary plan; both
    // combinations fail the row before any gift/tier work happens.
    it('rejects a gift row that also specifies a tier', async function () {
        const res = await upload('members-gift-with-tier.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.match(res.body.meta.stats.invalid[0].error, /Cannot specify both gift_id and import_tier/);
    });

    it('rejects a gift row that also specifies a complimentary plan', async function () {
        const res = await upload('members-gift-with-comp.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.match(res.body.meta.stats.invalid[0].error, /Cannot specify both gift_id and complimentary_plan/);
    });

    // A row naming a tier that does not exist fails, and its member creation is
    // rolled back with it, so nothing is imported.
    it('rejects a row naming a tier that does not exist', async function () {
        const res = await upload('members-invalid-tier.csv');

        assert.equal(res.status, 201);
        assert.equal(res.body.meta.stats.imported, 0);
        assert.equal(res.body.meta.stats.invalid.length, 1);
        assert.match(res.body.meta.stats.invalid[0].error, /is not a valid tier/);
    });

    // No file at all is a request error, not an import.
    it('rejects an upload with no file', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(422);

        assert.equal(res.body.errors[0].message, 'Please select a members CSV file.');
    });

    // Re-importing an existing member with blank name/note leaves the stored values
    // intact rather than clearing them.
    it('does not overwrite name or note with blanks on update', async function () {
        await upload('members-update-named.csv');
        const res = await upload('members-update-blank.csv');
        assert.equal(res.status, 201);

        const member = await findMember('member+update@example.com');
        assertExists(member);
        assert.equal(member.name, 'Original Name');
        assert.equal(member.note, 'Original note');
    });

    // Re-importing changes subscription state by the rules: a subscribed member turned
    // off is unsubscribed; a member with no newsletters is never re-subscribed by a
    // later true; a still-subscribed member keeps them.
    it('applies newsletter subscription rules on re-import', async function () {
        await upload('members-newsletters-step1.csv');
        await upload('members-newsletters-step2.csv');

        const turnedOff = await findMember('member+nl_a@example.com');
        assertExists(turnedOff);
        assert.equal(turnedOff.newsletters.length, 0, 'subscribed then unsubscribed → removed');

        const neverHad = await findMember('member+nl_b@example.com');
        assertExists(neverHad);
        assert.equal(neverHad.newsletters.length, 0, 'no newsletters → not re-subscribed by a later true');

        const kept = await findMember('member+nl_c@example.com');
        assertExists(kept);
        assert.equal(kept.newsletters.length, subscribeOnSignupCount, 'still subscribed → newsletters kept');
    });

    // Over the threshold the import is deferred to a background job, which imports the
    // rows and emails the caller a completion report.
    it('defers over the threshold and emails a completion report', async function () {
        configUtils.set('members:importer:inlineThreshold', 1);

        const res = await upload('members-deferred-mixed.csv');
        assert.equal(res.status, 202);
        assert.equal(res.body.meta.stats, undefined);

        // The deferred job reports by email and must finish inside the test: the mail
        // mock is torn down before the framework settles jobs.
        await jobsService.allSettled();
        mockManager.assert.sentEmailCount(1);
        // The report goes to the member manager who triggered the import -- the
        // authenticated request user, resolved by the import service from the frame.
        const email = mockManager.assert.sentEmail({subject: 'Your member import is complete', to: 'jbloggs@example.com'});

        // The completion email carries the failed rows as an attached error CSV.
        assertExists(email.attachments);
        assert.match(email.attachments[0].filename, / - Errors\.csv$/);
        assert.equal(email.attachments[0].contentType, 'text/csv');
        assert.ok(email.attachments[0].content.includes('not-a-valid-email'), 'error report lists the failed row');
    });
});
