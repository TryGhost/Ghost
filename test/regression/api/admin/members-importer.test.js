const path = require('path');
const querystring = require('querystring');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');

const {mockManager} = require('../../../utils/e2e-framework');

let request;

describe('Members Importer API', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'members');
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockLabsEnabled('members');
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
                should(importedMember1.note).equal('no need to map me');
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
                jsonResponse.meta.stats.invalid.length.should.equal(1);

                jsonResponse.meta.stats.invalid[0].error.should.match(/Validation \(isEmail\) failed for email/);

                should.exist(jsonResponse.meta.import_label);
                jsonResponse.meta.import_label.slug.should.match(/^import-/);
            });
    });
});
