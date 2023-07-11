const path = require('path');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');
const configUtils = require('../../../utils/configUtils');
const settingsCache = require('../../../../core/shared/settings-cache');
const models = require('../../../../core/server/models');
const jobManager = require('../../../../core/server/services/jobs/job-service');

const {mockManager} = require('../../../utils/e2e-framework');
const assert = require('assert/strict');

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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                should.exist(jsonResponse.meta.import_label);
                jsonResponse.meta.import_label.slug.should.match(/^import-/);
                jsonResponse.meta.stats.imported.should.equal(2);
                jsonResponse.meta.stats.invalid.length.should.equal(0);

                importLabel = jsonResponse.meta.import_label.slug;
                return request
                    .get(localUtils.API.getApiQuery(`members/?&filter=label:${importLabel}`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                should.equal(jsonResponse.members.length, 2);

                const importedMember1 = jsonResponse.members.find(m => m.email === 'member+labels_1@example.com');
                should.exist(importedMember1);
                should(importedMember1.name).equal(null);
                should(importedMember1.note).equal(null);
                importedMember1.subscribed.should.equal(true);
                importedMember1.comped.should.equal(false);
                importedMember1.subscriptions.should.not.be.undefined();
                importedMember1.subscriptions.length.should.equal(0);

                // check label order
                // 1 unique global + 1 record labels + 1 auto generated label
                importedMember1.labels.length.should.equal(3);
                should.exist(importedMember1.labels.find(({slug}) => slug === 'label'));
                should.exist(importedMember1.labels.find(({slug}) => slug === 'global-label-1'));
                should.exist(importedMember1.labels.find(({slug}) => slug.match(/^import-/)));

                const importedMember2 = jsonResponse.members.find(m => m.email === 'member+labels_2@example.com');
                should.exist(importedMember2);
                // 1 unique global + 2 record labels
                importedMember2.labels.length.should.equal(4);
                should.exist(importedMember2.labels.find(({slug}) => slug === 'another-label'));
                should.exist(importedMember2.labels.find(({slug}) => slug === 'and-one-more'));
                should.exist(importedMember2.labels.find(({slug}) => slug === 'global-label-1'));
                should.exist(importedMember2.labels.find(({slug}) => slug.match(/^import-/)));
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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                jsonResponse.meta.stats.imported.should.equal(1);
                jsonResponse.meta.stats.invalid.length.should.equal(0);

                should.exist(jsonResponse.meta.import_label);
                jsonResponse.meta.import_label.slug.should.match(/^import-/);
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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                should.exist(jsonResponse.members[0]);

                const importedMember1 = jsonResponse.members[0];
                should(importedMember1.email).equal('member+mapped_1@example.com');
                should(importedMember1.name).equal('Hannah');
                should(importedMember1.note).equal('do map me');
                importedMember1.subscribed.should.equal(true);
                importedMember1.comped.should.equal(false);
                importedMember1.subscriptions.should.not.be.undefined();
                importedMember1.subscriptions.length.should.equal(0);
                importedMember1.labels.length.should.equal(1); // auto-generated import label
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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                jsonResponse.meta.stats.imported.should.equal(2);
                jsonResponse.meta.stats.invalid.length.should.equal(0);
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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.members);

                const defaultMember1 = jsonResponse.members.find(member => (member.email === 'member+defaults_1@example.com'));
                should(defaultMember1.name).equal(null);
                should(defaultMember1.note).equal(null);
                defaultMember1.subscribed.should.equal(true);
                defaultMember1.comped.should.equal(false);
                defaultMember1.subscriptions.should.not.be.undefined();
                defaultMember1.subscriptions.length.should.equal(0);
                defaultMember1.labels.length.should.equal(1); // auto-generated import label

                const defaultMember2 = jsonResponse.members.find(member => (member.email === 'member+defaults_2@example.com'));
                should(defaultMember2).not.be.undefined();
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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.not.exist(jsonResponse.meta.stats);
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
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                jsonResponse.meta.stats.imported.should.equal(1);
                jsonResponse.meta.stats.invalid.length.should.equal(2);

                jsonResponse.meta.stats.invalid[0].error.should.match(/Invalid Email/);
                jsonResponse.meta.stats.invalid[1].error.should.match(/Invalid Email/);

                should.exist(jsonResponse.meta.import_label);
                jsonResponse.meta.import_label.slug.should.match(/^import-/);
            });
    });

    it('Can import members with host emailVerification limits', async function () {
        // If this test fails, check if the total members that have been created with fixtures has increased a lot, and if required, increase the amount of imported members
        configUtils.set('hostSettings:emailVerification', {
            apiThreshold: 2,
            adminThreshold: 2,
            importThreshold: 1, // note: this one isn't really used because (totalMembers - members_created_in_last_30_days) is larger and used instead
            verified: false,
            escalationAddress: 'test@example.com'
        });

        const res = await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['new-global-label'])
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-import-large.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);
        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;

        should.exist(jsonResponse);
        should.exist(jsonResponse.meta);
        should.exist(jsonResponse.meta.stats);

        jsonResponse.meta.stats.imported.should.equal(10);
        jsonResponse.meta.stats.invalid.length.should.equal(0);

        assert(!!settingsCache.get('email_verification_required'), 'Email verification should now be required');

        mockManager.assert.sentEmail({
            subject: 'Email needs verification'
        });
    });

    it('Can still import members once email verification is required but does not send email', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['new-global-label'])
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-import-large.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);
        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;

        should.exist(jsonResponse);
        should.exist(jsonResponse.meta);
        should.exist(jsonResponse.meta.stats);

        jsonResponse.meta.stats.imported.should.equal(10);
        jsonResponse.meta.stats.invalid.length.should.equal(0);

        assert(!!settingsCache.get('email_verification_required'), 'Email verification should now be required');

        // Don't send another email
        mockManager.assert.sentEmailCount(0);
    });

    it('Can import members with host emailVerification limits for large imports', async function () {
        await models.Settings.edit([{
            key: 'email_verification_required',
            value: false
        }], {context: {internal: true}});

        assert(!settingsCache.get('email_verification_required'), 'Email verification should not be required');

        // If this test fails, check if the total members that have been created with fixtures has increased a lot, and if required, increase the amount of imported members
        configUtils.set('hostSettings:emailVerification', {
            apiThreshold: 2,
            adminThreshold: 2,
            importThreshold: 1, // note: this one isn't really used because (totalMembers - members_created_in_last_30_days) is larger and used instead
            verified: false,
            escalationAddress: 'test@example.com'
        });

        const awaitCompletion = jobManager.awaitCompletion('members-import');

        const res = await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['new-global-label'])
            .attach('membersfile', path.join(__dirname, '/../../../utils/fixtures/csv/valid-members-import-large-501.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(202);
        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;

        should.exist(jsonResponse);
        should.exist(jsonResponse.meta);

        // Wait for the job to finish
        await awaitCompletion;

        assert(!!settingsCache.get('email_verification_required'), 'Email verification should now be required');

        mockManager.assert.sentEmail({
            subject: 'Email needs verification'
        });
    });
});
