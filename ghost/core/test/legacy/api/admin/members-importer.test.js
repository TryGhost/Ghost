const path = require('path');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');
const settingsCache = require('../../../../core/shared/settings-cache');
const jobManager = require('../../../../core/server/services/jobs/job-service');

const {mockManager} = require('../../../utils/e2e-framework');
const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const {setupEmailVerificationUtils, restoreEmailVerificationUtils} = require('../../../utils/email-verification-utils');

let request;

describe('Members Importer API', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'members');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can import CSV with minimum one field and labels', function () {
        let importLabel;

        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['global-label-1', 'global-label-1'])
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-labels.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.meta);
                assertExists(jsonResponse.meta.stats);

                assertExists(jsonResponse.meta.import_label);
                assert.match(jsonResponse.meta.import_label.slug, /^import-/);
                assert.equal(jsonResponse.meta.stats.imported, 2);
                assert.equal(jsonResponse.meta.stats.invalid.length, 0);

                importLabel = jsonResponse.meta.import_label.slug;
                return request
                    .get(localUtils.API.getApiQuery(`members/?&filter=label:${importLabel}`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.members);
                assert.equal(jsonResponse.members.length, 2);

                const importedMember1 = jsonResponse.members.find(m => m.email === 'member+labels_1@example.com');
                assertExists(importedMember1);
                assert.equal(importedMember1.name, null);
                assert.equal(importedMember1.note, null);
                assert.equal(importedMember1.subscribed, true);
                assert.equal(importedMember1.comped, false);
                assertExists(importedMember1.subscriptions);
                assert.equal(importedMember1.subscriptions.length, 0);

                // check label order
                // 1 unique global + 1 record labels + 1 auto generated label
                assert.equal(importedMember1.labels.length, 3);
                assertExists(importedMember1.labels.find(({slug}) => slug === 'label'));
                assertExists(importedMember1.labels.find(({slug}) => slug === 'global-label-1'));
                assertExists(importedMember1.labels.find(({slug}) => slug.match(/^import-/)));

                const importedMember2 = jsonResponse.members.find(m => m.email === 'member+labels_2@example.com');
                assertExists(importedMember2);
                // 1 unique global + 2 record labels
                assert.equal(importedMember2.labels.length, 4);
                assertExists(importedMember2.labels.find(({slug}) => slug === 'another-label'));
                assertExists(importedMember2.labels.find(({slug}) => slug === 'and-one-more'));
                assertExists(importedMember2.labels.find(({slug}) => slug === 'global-label-1'));
                assertExists(importedMember2.labels.find(({slug}) => slug.match(/^import-/)));
            });
    });

    it('Can import CSV with mapped fields', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('mapping[correo_electrpnico]', 'email')
            .field('mapping[nombre]', 'name')
            .field('mapping[note]', 'note')
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/members-with-mappings.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.meta);
                assertExists(jsonResponse.meta.stats);

                assert.equal(jsonResponse.meta.stats.imported, 1);
                assert.equal(jsonResponse.meta.stats.invalid.length, 0);

                assertExists(jsonResponse.meta.import_label);
                assert.match(jsonResponse.meta.import_label.slug, /^import-/);
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent('member+mapped_1@example.com')}`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.members);
                assertExists(jsonResponse.members[0]);

                const importedMember1 = jsonResponse.members[0];
                assert.equal(importedMember1.email, 'member+mapped_1@example.com');
                assert.equal(importedMember1.name, 'Hannah');
                assert.equal(importedMember1.note, 'do map me');
                assert.equal(importedMember1.subscribed, true);
                assert.equal(importedMember1.comped, false);
                assertExists(importedMember1.subscriptions);
                assert.equal(importedMember1.subscriptions.length, 0);
                assert.equal(importedMember1.labels.length, 1); // auto-generated import label
            });
    });

    it('Can import CSV with labels and provide additional labels', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-defaults.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.meta);
                assertExists(jsonResponse.meta.stats);

                assert.equal(jsonResponse.meta.stats.imported, 2);
                assert.equal(jsonResponse.meta.stats.invalid.length, 0);
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery(`members/`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.members);

                const defaultMember1 = jsonResponse.members.find(member => (member.email === 'member+defaults_1@example.com'));
                assert.equal(defaultMember1.name, null);
                assert.equal(defaultMember1.note, null);
                assert.equal(defaultMember1.subscribed, true);
                assert.equal(defaultMember1.comped, false);
                assertExists(defaultMember1.subscriptions);
                assert.equal(defaultMember1.subscriptions.length, 0);
                assert.equal(defaultMember1.labels.length, 1); // auto-generated import label

                const defaultMember2 = jsonResponse.members.find(member => (member.email === 'member+defaults_2@example.com'));
                assertExists(defaultMember2);
            });
    });

    it('Runs imports with stripe_customer_id as background job', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/members-with-stripe-ids.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(202)
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.meta);
                assert.equal(jsonResponse.meta.stats, undefined);
            });
    });

    it('Fails to import member with invalid values', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['new-global-label'])
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/members-invalid-values.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;

                assertExists(jsonResponse);
                assertExists(jsonResponse.meta);
                assertExists(jsonResponse.meta.stats);

                assert.equal(jsonResponse.meta.stats.imported, 1);
                assert.equal(jsonResponse.meta.stats.invalid.length, 2);

                assert.match(jsonResponse.meta.stats.invalid[0].error, /Invalid Email/);
                assert.match(jsonResponse.meta.stats.invalid[1].error, /Invalid Email/);

                assertExists(jsonResponse.meta.import_label);
                assert.match(jsonResponse.meta.import_label.slug, /^import-/);
            });
    });

    it('Can import members with host emailVerification limits', async function () {
        try {
            // If this test fails, check if the total members that have been created with fixtures has increased a lot, and if required, increase the amount of imported members
            const {receivedWebhookRequests} = await setupEmailVerificationUtils({
                apiThreshold: 2,
                adminThreshold: 2,
                importThreshold: 1, // note: this one isn't really used because (totalMembers - members_created_in_last_30_days) is larger and used instead
                persist: true
            });

            assert.equal(settingsCache.get('email_verification_required'), false, 'Email verification should not be required');

            const awaitCompletion = jobManager.awaitCompletion('members-import');

            const res = await request
                .post(localUtils.API.getApiQuery(`members/upload/`))
                .field('labels', ['new-global-label'])
                .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-import-large-501.csv'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(202);
            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;

            assertExists(jsonResponse);
            assertExists(jsonResponse.meta);

            // Wait for the job to finish
            await awaitCompletion;

            assert.equal(settingsCache.get('email_verification_required'), true, 'Email verification should now be required');

            assert.equal(receivedWebhookRequests.length, 1, 'Expected to receive webhook requests');

            const secondImport = await request
                .post(localUtils.API.getApiQuery(`members/upload/`))
                .field('labels', ['new-global-label'])
                .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-import-large.csv'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);
            assert.equal(secondImport.headers['x-cache-invalidate'], undefined);
            const secondJsonResponse = secondImport.body;

            assertExists(secondJsonResponse);
            assertExists(secondJsonResponse.meta);
            assertExists(secondJsonResponse.meta.stats);

            assert.equal(secondJsonResponse.meta.stats.imported, 10);
            assert.equal(secondJsonResponse.meta.stats.invalid.length, 0);

            assert.equal(settingsCache.get('email_verification_required'), true, 'Email verification should still be required');

            // Don't send another email
            assert.equal(receivedWebhookRequests.length, 1, 'Expected no further webhook requests after second import');
        } finally {
            await restoreEmailVerificationUtils();
        }
    });

    it('Can import members with host emailVerification limits for large imports', async function () {
        try {
            // If this test fails, check if the total members that have been created with fixtures has increased a lot, and if required, increase the amount of imported members
            const {receivedWebhookRequests} = await setupEmailVerificationUtils({
                apiThreshold: 2,
                adminThreshold: 2,
                importThreshold: 1 // note: this one isn't really used because (totalMembers - members_created_in_last_30_days) is larger and used instead
            });

            assert.equal(settingsCache.get('email_verification_required'), false, 'Email verification should not be required');

            const awaitCompletion = jobManager.awaitCompletion('members-import');

            const res = await request
                .post(localUtils.API.getApiQuery(`members/upload/`))
                .field('labels', ['new-global-label'])
                .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-import-large-501.csv'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(202);
            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;

            assertExists(jsonResponse);
            assertExists(jsonResponse.meta);

            // Wait for the job to finish
            await awaitCompletion;

            assert.equal(settingsCache.get('email_verification_required'), true, 'Email verification should now be required');

            mockManager.assert.sentEmail({
                subject: 'Your member import is complete'
            });

            assert.equal(receivedWebhookRequests.length, 1, 'Expected to receive webhook requests');
        } finally {
            await restoreEmailVerificationUtils();
        }
    });
});
