const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const labs = require('../../../core/shared/labs');
const Papa = require('papaparse');

describe('Members API', function () {
    let request;

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'members', 'members:emails');
        sinon.stub(labs, 'isSet').withArgs('members').returns(true);
    });

    it('Can browse', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('members/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(8);
        localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');

        testUtils.API.isISO8601(jsonResponse.members[0].created_at).should.be.true();
        jsonResponse.members[0].created_at.should.be.an.instanceof(String);

        jsonResponse.meta.pagination.should.have.property('page', 1);
        jsonResponse.meta.pagination.should.have.property('limit', 15);
        jsonResponse.meta.pagination.should.have.property('pages', 1);
        jsonResponse.meta.pagination.should.have.property('total', 8);
        jsonResponse.meta.pagination.should.have.property('next', null);
        jsonResponse.meta.pagination.should.have.property('prev', null);
    });

    it('Can browse with filter', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('members/?filter=label:label-1'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse, 'members');
        localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can browse with search', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('members/?search=member1'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);
        jsonResponse.members[0].email.should.equal('member1@test.com');
        localUtils.API.checkResponse(jsonResponse, 'members');
        localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can filter by paid status', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('members/?filter=status:paid'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(5);
        jsonResponse.members[0].email.should.equal('paid@test.com');
        jsonResponse.members[1].email.should.equal('trialing@test.com');
        localUtils.API.checkResponse(jsonResponse, 'members');
        localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can read', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/${testUtils.DataGenerator.Content.members[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.members[0], 'member', ['subscriptions', 'products']);
    });

    it('Can read and include email_recipients', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/${testUtils.DataGenerator.Content.members[0].id}/?include=email_recipients`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.members[0], 'member', ['subscriptions', 'email_recipients', 'products']);
        jsonResponse.members[0].email_recipients.length.should.equal(1);
        localUtils.API.checkResponse(jsonResponse.members[0].email_recipients[0], 'email_recipient', ['email']);
        localUtils.API.checkResponse(jsonResponse.members[0].email_recipients[0].email, 'email');
    });

    it('Can add', async function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label']
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);

        jsonResponse.members[0].name.should.equal(member.name);
        jsonResponse.members[0].email.should.equal(member.email);
        jsonResponse.members[0].note.should.equal(member.note);
        jsonResponse.members[0].subscribed.should.equal(member.subscribed);
        testUtils.API.isISO8601(jsonResponse.members[0].created_at).should.be.true();

        jsonResponse.members[0].labels.length.should.equal(1);
        jsonResponse.members[0].labels[0].name.should.equal('test-label');

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('members/')}${res.body.members[0].id}/`);

        await request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    it('Can edit by id', async function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2Change@test.com',
            note: 'initial note',
            subscribed: true
        };

        const memberChanged = {
            name: 'changed',
            email: 'cantChangeMe@test.com',
            note: 'edited note',
            subscribed: false
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [memberToChange]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('members/')}${res.body.members[0].id}/`);

        const newMember = jsonResponse.members[0];

        const res2 = await request
            .put(localUtils.API.getApiQuery(`members/${newMember.id}/`))
            .send({members: [memberChanged]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res2.headers['x-cache-invalidate']);

        const jsonResponse2 = res2.body;

        should.exist(jsonResponse2);
        should.exist(jsonResponse2.members);
        jsonResponse2.members.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse2.members[0], 'member', ['subscriptions', 'products']);
        jsonResponse2.members[0].name.should.equal(memberChanged.name);
        jsonResponse2.members[0].email.should.equal(memberChanged.email);
        jsonResponse2.members[0].email.should.not.equal(memberToChange.email);
        jsonResponse2.members[0].note.should.equal(memberChanged.note);
        jsonResponse2.members[0].subscribed.should.equal(memberChanged.subscribed);
    });

    it('Can destroy', async function () {
        const member = {
            name: 'test',
            email: 'memberTestDestroy@test.com'
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);

        const jsonResponse = res.body;

        should.exist(jsonResponse);
        should.exist(jsonResponse.members);

        const newMember = jsonResponse.members[0];

        await request
            .delete(localUtils.API.getApiQuery(`members/${newMember.id}`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);

        await request
            .get(localUtils.API.getApiQuery(`members/${newMember.id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Can export CSV', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/upload/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /text\/csv/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        res.headers['content-disposition'].should.match(/Attachment;\sfilename="members/);
        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    it('Can export a filtered CSV', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/upload/?search=Egg`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /text\/csv/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        res.headers['content-disposition'].should.match(/Attachment;\sfilename="members/);
        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.not.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.not.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.not.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    it('Can import CSV', async function () {
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
        importedMember2.labels.length.should.equal(2);
        testUtils.API.isISO8601(importedMember2.created_at).should.be.true();
        importedMember2.created_at.should.equal('1991-10-02T20:30:31.000Z');
        importedMember2.comped.should.equal(false);
        importedMember2.subscriptions.should.not.be.undefined();
        importedMember2.subscriptions.length.should.equal(0);
    });

    it('Can fetch member counts stats', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('members/stats/count/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.total);
        should.exist(jsonResponse.resource);
        should.exist(jsonResponse.data);
        const data = jsonResponse.data;
        // 2 from above posts, 2 from above import
        data[data.length - 1].free.should.equal(4);
        data[data.length - 1].paid.should.equal(0);
        data[data.length - 1].comped.should.equal(0);
    });

    it('Can import CSV and bulk destroy via auto-added label', function () {
        // HACK: mock dates otherwise we'll often get unexpected members appearing
        // from previous tests with the same import label due to auto-generated
        // import labels only including minutes
        sinon.stub(Date, 'now').returns(new Date('2021-03-30T17:21:00.000Z'));

        // import our dummy data for deletion
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-for-bulk-delete.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);
                should.exist(jsonResponse.meta.import_label);

                jsonResponse.meta.stats.imported.should.equal(8);

                return jsonResponse.meta.import_label;
            })
            .then((importLabel) => {
                // check that the import worked by checking browse response with filter
                return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        should.not.exist(res.headers['x-cache-invalidate']);
                        const jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.members);
                        jsonResponse.members.should.have.length(8);
                    })
                    .then(() => importLabel);
            })
            .then((importLabel) => {
                // perform the bulk delete
                return request
                    .del(localUtils.API.getApiQuery(`members/?filter=label:'${importLabel.slug}'`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        should.not.exist(res.headers['x-cache-invalidate']);
                        const jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.meta);
                        should.exist(jsonResponse.meta.stats);
                        should.exist(jsonResponse.meta.stats.successful);
                        should.equal(jsonResponse.meta.stats.successful, 8);
                    })
                    .then(() => importLabel);
            })
            .then((importLabel) => {
                // check that the bulk delete worked by checking browse response with filter
                return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        const jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.members);
                        jsonResponse.members.should.have.length(0);
                    });
            });
    });

    it('Can bulk unsubscribe members with filter', async function () {
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
            return member.subscribed;
        });

        should.ok(allMembersSubscribed);

        const bulkUnsubscribeResponse = await request
            .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-unsubscribe-test'))
            .set('Origin', config.get('url'))
            .send({
                action: 'unsubscribe'
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
            return !member.subscribed;
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
                action: 'addLabel',
                meta: {
                    label: labelToAdd
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
                action: 'removeLabel',
                meta: {
                    label: labelToRemove
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
