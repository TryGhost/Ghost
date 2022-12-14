const path = require('path');
const should = require('should');
const sinon = require('sinon');
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
        filteredNewsletters.length.should.be.greaterThan(0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

        const res = await request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-import.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;

        should.exist(jsonResponse);
        should.exist(jsonResponse.meta);
        should.exist(jsonResponse.meta.stats);

        jsonResponse.meta.stats.imported.should.equal(2);
        jsonResponse.meta.stats.invalid.length.should.equal(0);
        jsonResponse.meta.import_label.name.should.match(/^Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

        const importLabel = jsonResponse.meta.import_label;

        // check that members had the auto-generated label attached
        const res2 = await request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse2 = res2.body;
        should.exist(jsonResponse2);
        should.exist(jsonResponse2.members);
        jsonResponse2.members.should.have.length(2);

        const importedMember1 = jsonResponse2.members.find(m => m.email === 'jbloggs@example.com');
        should.exist(importedMember1);
        importedMember1.name.should.equal('joe');
        should(importedMember1.note).equal(null);
        importedMember1.subscribed.should.equal(true);
        importedMember1.newsletters.length.should.equal(filteredNewsletters.length);
        importedMember1.labels.length.should.equal(1);
        testUtils.API.isISO8601(importedMember1.created_at).should.be.true();
        importedMember1.comped.should.equal(false);
        importedMember1.subscriptions.should.not.be.undefined();
        importedMember1.subscriptions.length.should.equal(0);

        const importedMember2 = jsonResponse2.members.find(m => m.email === 'test@example.com');
        should.exist(importedMember2);
        importedMember2.name.should.equal('test');
        should(importedMember2.note).equal('test note');
        importedMember2.subscribed.should.equal(false);
        importedMember2.newsletters.length.should.equal(0);
        importedMember2.labels.length.should.equal(2);
        testUtils.API.isISO8601(importedMember2.created_at).should.be.true();
        importedMember2.created_at.should.equal('1991-10-02T20:30:31.000Z');
        importedMember2.comped.should.equal(false);
        importedMember2.subscriptions.should.not.be.undefined();
        importedMember2.subscriptions.length.should.equal(0);
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

    //             should.exist(jsonResponse);
    //             should.exist(jsonResponse.meta);
    //             should.exist(jsonResponse.meta.stats);
    //             should.exist(jsonResponse.meta.import_label);

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
    //                     should.exist(jsonResponse);
    //                     should.exist(jsonResponse.members);
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
    //                     should.exist(jsonResponse);
    //                     should.exist(jsonResponse.meta);
    //                     should.exist(jsonResponse.meta.stats);
    //                     should.exist(jsonResponse.meta.stats.successful);
    //                     should.equal(jsonResponse.meta.stats.successful, 8);
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
    //                     should.exist(jsonResponse);
    //                     should.exist(jsonResponse.members);
    //                     jsonResponse.members.should.have.length(0);
    //                 });
    //         });
    // });

    it('Can bulk unsubscribe members with filter', async function () {
        const filteredNewsletters = newsletters.filter(n => n.get('subscribe_on_signup'));
        filteredNewsletters.length.should.be.greaterThan(0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

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

        browseResponse.body.members.should.have.length(8);
        const allMembersSubscribed = browseResponse.body.members.every((member) => {
            return member.subscribed && member.newsletters.length > 0;
        });

        should.ok(allMembersSubscribed);

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

        should.exist(bulkUnsubscribeResponse.body.bulk);
        should.exist(bulkUnsubscribeResponse.body.bulk.meta);
        should.exist(bulkUnsubscribeResponse.body.bulk.meta.stats);
        should.exist(bulkUnsubscribeResponse.body.bulk.meta.stats.successful);
        should.equal(bulkUnsubscribeResponse.body.bulk.meta.stats.successful, 8);

        const postUnsubscribeBrowseResponse = await request
            .get(localUtils.API.getApiQuery('members/?filter=label:bulk-unsubscribe-test'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        postUnsubscribeBrowseResponse.body.members.should.have.length(8);
        const allMembersUnsubscribed = postUnsubscribeBrowseResponse.body.members.every((member) => {
            return member.newsletters.length === 0;
        });

        should.ok(allMembersUnsubscribed);
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

        should.exist(bulkAddLabelResponse.body.bulk);
        should.exist(bulkAddLabelResponse.body.bulk.meta);
        should.exist(bulkAddLabelResponse.body.bulk.meta.stats);
        should.exist(bulkAddLabelResponse.body.bulk.meta.stats.successful);
        should.equal(bulkAddLabelResponse.body.bulk.meta.stats.successful, 8);

        const postLabelAddBrowseResponse = await request
            .get(localUtils.API.getApiQuery(`members/?filter=label:${labelToAdd.slug}`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        postLabelAddBrowseResponse.body.members.should.have.length(8);

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

        should.exist(bulkRemoveLabelResponse.body.bulk);
        should.exist(bulkRemoveLabelResponse.body.bulk.meta);
        should.exist(bulkRemoveLabelResponse.body.bulk.meta.stats);
        should.exist(bulkRemoveLabelResponse.body.bulk.meta.stats.successful);
        should.equal(bulkRemoveLabelResponse.body.bulk.meta.stats.successful, 8);

        const postLabelRemoveBrowseResponse = await request
            .get(localUtils.API.getApiQuery(`members/?filter=label:${labelToRemove.slug}`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        postLabelRemoveBrowseResponse.body.members.should.have.length(0);
    });
});
