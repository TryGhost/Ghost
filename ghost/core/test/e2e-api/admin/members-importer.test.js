const path = require('path');
const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');

const {mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

let request;

async function getNewsletters() {
    return (await models.Newsletter.findAll({filter: 'status:active'})).models;
}

describe('Members Importer API', function () {
    let newsletters;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'newsletters', 'members:newsletters');

        newsletters = await getNewsletters();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can import CSV', async function () {
        const filteredNewsletters = newsletters.filter(n => n.get('subscribe_on_signup'));
        assert(filteredNewsletters.length > 0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

        const res = await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-import.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;

        assertExists(jsonResponse);
        assertExists(jsonResponse.meta);
        assertExists(jsonResponse.meta.stats);

        assert.equal(jsonResponse.meta.stats.imported, 2);
        assert.equal(jsonResponse.meta.stats.invalid.length, 0);
        assert.match(jsonResponse.meta.import_label.name, /^Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

        const importLabel = jsonResponse.meta.import_label;

        // check that members had the auto-generated label attached
        const res2 = await request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse2 = res2.body;
        assertExists(jsonResponse2);
        assertExists(jsonResponse2.members);
        assert.equal(jsonResponse2.members.length, 2);

        const importedMember1 = jsonResponse2.members.find(m => m.email === 'jbloggs@example.com');
        assertExists(importedMember1);
        assert.equal(importedMember1.name, 'joe');
        assert.equal(importedMember1.note, null);
        assert.equal(importedMember1.subscribed, true);
        assert.equal(importedMember1.newsletters.length, filteredNewsletters.length);
        assert.equal(importedMember1.labels.length, 1);
        assert.equal(testUtils.API.isISO8601(importedMember1.created_at), true);
        assert.equal(importedMember1.comped, false);
        assertExists(importedMember1.subscriptions);
        assert.equal(importedMember1.subscriptions.length, 0);

        const importedMember2 = jsonResponse2.members.find(m => m.email === 'test@example.com');
        assertExists(importedMember2);
        assert.equal(importedMember2.name, 'test');
        assert.equal(importedMember2.note, 'test note');
        assert.equal(importedMember2.subscribed, false);
        assert.equal(importedMember2.newsletters.length, 0);
        assert.equal(importedMember2.labels.length, 2);
        assert.equal(testUtils.API.isISO8601(importedMember2.created_at), true);
        assert.equal(importedMember2.created_at, '1991-10-02T20:30:31.000Z');
        assert.equal(importedMember2.comped, false);
        assertExists(importedMember2.subscriptions);
        assert.equal(importedMember2.subscriptions.length, 0);
    });

    //TODO: fix this test and uncomment it
    // it('Can import CSV and bulk destroy via auto-added label', function () {
    //     // HACK: mock dates otherwise we'll often get unexpected members appearing
    //     // from previous tests with the same import label due to auto-generated
    //     // import labels only including minutes
    //     sinon.stub(Date, 'now').returns(new Date('2021-03-30T17:21:00.000Z'));

    //     // import our dummy data for deletion
    //     return request
    //         .post(localUtils.API.getApiQuery(`members/upload/`))
    //         .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-for-bulk-delete.csv'))
    //         .set('Origin', config.get('url'))
    //         .expect('Content-Type', /json/)
    //         .expect('Cache-Control', testUtils.cacheRules.private)
    //         .then((res) => {
    //             should.not.exist(res.headers['x-cache-invalidate']);

    //             const jsonResponse = res.body;

    //             assertExists(jsonResponse);
    //             assertExists(jsonResponse.meta);
    //             assertExists(jsonResponse.meta.stats);
    //             assertExists(jsonResponse.meta.import_label);

    //             jsonResponse.meta.stats.imported.should.equal(8);

    //             return jsonResponse.meta.import_label;
    //         })
    //         .then((importLabel) => {
    //             // check that the import worked by checking browse response with filter
    //             return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
    //                 .set('Origin', config.get('url'))
    //                 .expect('Content-Type', /json/)
    //                 .expect('Cache-Control', testUtils.cacheRules.private)
    //                 .expect(200)
    //                 .then((res) => {
    //                     should.not.exist(res.headers['x-cache-invalidate']);
    //                     const jsonResponse = res.body;
    //                     assertExists(jsonResponse);
    //                     assertExists(jsonResponse.members);
    //                     jsonResponse.members.should.have.length(8);
    //                 })
    //                 .then(() => importLabel);
    //         })
    //         .then((importLabel) => {
    //             // perform the bulk delete
    //             return request
    //                 .del(localUtils.API.getApiQuery(`members/?filter=label:'${importLabel.slug}'`))
    //                 .set('Origin', config.get('url'))
    //                 .expect('Content-Type', /json/)
    //                 .expect('Cache-Control', testUtils.cacheRules.private)
    //                 .expect(200)
    //                 .then((res) => {
    //                     should.not.exist(res.headers['x-cache-invalidate']);
    //                     const jsonResponse = res.body;
    //                     assertExists(jsonResponse);
    //                     assertExists(jsonResponse.meta);
    //                     assertExists(jsonResponse.meta.stats);
    //                     assertExists(jsonResponse.meta.stats.successful);
    //                     assert.equal(jsonResponse.meta.stats.successful, 8);
    //                 })
    //                 .then(() => importLabel);
    //         })
    //         .then((importLabel) => {
    //             // check that the bulk delete worked by checking browse response with filter
    //             return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
    //                 .set('Origin', config.get('url'))
    //                 .expect('Content-Type', /json/)
    //                 .expect('Cache-Control', testUtils.cacheRules.private)
    //                 .expect(200)
    //                 .then((res) => {
    //                     const jsonResponse = res.body;
    //                     assertExists(jsonResponse);
    //                     assertExists(jsonResponse.members);
    //                     jsonResponse.members.should.have.length(0);
    //                 });
    //         });
    // });

    it('Can bulk unsubscribe members with filter', async function () {
        const filteredNewsletters = newsletters.filter(n => n.get('subscribe_on_signup'));
        assert(filteredNewsletters.length > 0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

        // import our dummy data for deletion
        await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/members-for-bulk-unsubscribe.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        const browseResponse = await request
            .get(localUtils.API.getApiQuery('members/?filter=label:bulk-unsubscribe-test'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(browseResponse.body.members.length, 8);
        const allMembersSubscribed = browseResponse.body.members.every((member) => {
            return member.subscribed && member.newsletters.length > 0;
        });

        assert(allMembersSubscribed);

        const bulkUnsubscribeResponse = await request
            .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-unsubscribe-test'))
            .set('Origin', config.get('url'))
            .send({
                bulk: {
                    action: 'unsubscribe'
                }
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assertExists(bulkUnsubscribeResponse.body.bulk);
        assertExists(bulkUnsubscribeResponse.body.bulk.meta);
        assertExists(bulkUnsubscribeResponse.body.bulk.meta.stats);
        assertExists(bulkUnsubscribeResponse.body.bulk.meta.stats.successful);
        assert.equal(bulkUnsubscribeResponse.body.bulk.meta.stats.successful, 8);

        const postUnsubscribeBrowseResponse = await request
            .get(localUtils.API.getApiQuery('members/?filter=label:bulk-unsubscribe-test'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(postUnsubscribeBrowseResponse.body.members.length, 8);
        const allMembersUnsubscribed = postUnsubscribeBrowseResponse.body.members.every((member) => {
            return member.newsletters.length === 0;
        });

        assert(allMembersUnsubscribed);
    });

    it('Can bulk add and remove labels to members with filter', async function () {
        // import our dummy data for deletion
        await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/members-for-bulk-add-labels.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        const newLabelResponse = await request
            .post(localUtils.API.getApiQuery('labels'))
            .set('Origin', config.get('url'))
            .send({
                labels: [{
                    name: 'Awesome Label For Testing Bulk Add'
                }]
            });

        const labelToAdd = newLabelResponse.body.labels[0];

        const bulkAddLabelResponse = await request
            .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-add-labels-test'))
            .set('Origin', config.get('url'))
            .send({
                bulk: {
                    action: 'addLabel',
                    meta: {
                        label: labelToAdd
                    }
                }
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assertExists(bulkAddLabelResponse.body.bulk);
        assertExists(bulkAddLabelResponse.body.bulk.meta);
        assertExists(bulkAddLabelResponse.body.bulk.meta.stats);
        assertExists(bulkAddLabelResponse.body.bulk.meta.stats.successful);
        assert.equal(bulkAddLabelResponse.body.bulk.meta.stats.successful, 8);

        const postLabelAddBrowseResponse = await request
            .get(localUtils.API.getApiQuery(`members/?filter=label:${labelToAdd.slug}`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(postLabelAddBrowseResponse.body.members.length, 8);

        const labelToRemove = newLabelResponse.body.labels[0];

        const bulkRemoveLabelResponse = await request
            .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-add-labels-test'))
            .set('Origin', config.get('url'))
            .send({
                bulk: {
                    action: 'removeLabel',
                    meta: {
                        label: labelToRemove
                    }
                }
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assertExists(bulkRemoveLabelResponse.body.bulk);
        assertExists(bulkRemoveLabelResponse.body.bulk.meta);
        assertExists(bulkRemoveLabelResponse.body.bulk.meta.stats);
        assertExists(bulkRemoveLabelResponse.body.bulk.meta.stats.successful);
        assert.equal(bulkRemoveLabelResponse.body.bulk.meta.stats.successful, 8);

        const postLabelRemoveBrowseResponse = await request
            .get(localUtils.API.getApiQuery(`members/?filter=label:${labelToRemove.slug}`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(postLabelRemoveBrowseResponse.body.members.length, 0);
    });

    it('Can handle empty body', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);

        assert.equal(res.body.errors[0].message, 'Please select a members CSV file.');
    });
});
