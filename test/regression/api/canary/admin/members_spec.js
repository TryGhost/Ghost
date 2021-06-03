const path = require('path');
const querystring = require('querystring');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../core/shared/config');
const labs = require('../../../../../core/server/services/labs');
const mailService = require('../../../../../core/server/services/mail');

const ghost = testUtils.startGhost;

let request;

describe('Members API (canary)', function () {
    before(function () {
        sinon.stub(labs, 'isSet').withArgs('members').returns(true);
    });

    after(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'members');
            });
    });

    beforeEach(function () {
        sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can add and send a signup confirmation email', async function () {
        const member = {
            name: 'Send Me Confirmation',
            email: 'member_getting_confirmation@test.com',
            subscribed: true
        };

        const queryParams = {
            send_email: true,
            email_type: 'signup'
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`members/?${querystring.stringify(queryParams)}`))
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
        jsonResponse.members[0].subscribed.should.equal(member.subscribed);
        testUtils.API.isISO8601(jsonResponse.members[0].created_at).should.be.true();

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('members/')}${res.body.members[0].id}/`);

        mailService.GhostMailer.prototype.send.called.should.be.true();
        mailService.GhostMailer.prototype.send.args[0][0].to.should.equal('member_getting_confirmation@test.com');

        await request
            .delete(localUtils.API.getApiQuery(`members/${jsonResponse.members[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);
    });

    it('Can order by email_open_rate', async function () {
        await request
            .get(localUtils.API.getApiQuery('members/?order=email_open_rate%20desc'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.members);
                localUtils.API.checkResponse(jsonResponse, 'members');
                jsonResponse.members.should.have.length(8);

                jsonResponse.members[0].email.should.equal('paid@test.com');
                jsonResponse.members[0].email_open_rate.should.equal(80);
                jsonResponse.members[1].email.should.equal('member2@test.com');
                jsonResponse.members[1].email_open_rate.should.equal(50);
                jsonResponse.members[2].email.should.equal('member1@test.com');
                should.equal(null, jsonResponse.members[2].email_open_rate);
                jsonResponse.members[3].email.should.equal('trialing@test.com');
                should.equal(null, jsonResponse.members[3].email_open_rate);
            });

        await request
            .get(localUtils.API.getApiQuery('members/?order=email_open_rate%20asc'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;
                localUtils.API.checkResponse(jsonResponse, 'members');
                jsonResponse.members.should.have.length(8);

                jsonResponse.members[0].email.should.equal('member2@test.com');
                jsonResponse.members[0].email_open_rate.should.equal(50);
                jsonResponse.members[1].email.should.equal('paid@test.com');
                jsonResponse.members[1].email_open_rate.should.equal(80);
                jsonResponse.members[2].email.should.equal('member1@test.com');
                should.equal(null, jsonResponse.members[2].email_open_rate);
                jsonResponse.members[3].email.should.equal('trialing@test.com');
                should.equal(null, jsonResponse.members[3].email_open_rate);
            });
    });

    it('Can search by case-insensitive name', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?search=egg'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
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
    });

    it('Can search by case-insensitive email', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?search=MEMBER2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                jsonResponse.members[0].email.should.equal('member2@test.com');
                localUtils.API.checkResponse(jsonResponse, 'members');
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Can search for paid members', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?search=egon&paid=true'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                jsonResponse.members[0].email.should.equal('paid@test.com');
                localUtils.API.checkResponse(jsonResponse, 'members');
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Search for non existing member returns empty result set', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?search=do_not_exist'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(0);
            });
    });

    it('Paid members subscriptions has price data', function () {
        const memberChanged = {
            name: 'Updated name'
        };
        return request
            .get(localUtils.API.getApiQuery('members/?search=egon&paid=true'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                should.exist(jsonResponse.members[0].subscriptions[0].price);
                return jsonResponse.members[0];
            }).then((paidMember) => {
                return request
                    .put(localUtils.API.getApiQuery(`members/${paidMember.id}/`))
                    .send({members: [memberChanged]})
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        should.not.exist(res.headers['x-cache-invalidate']);

                        const jsonResponse = res.body;

                        should.exist(jsonResponse);
                        should.exist(jsonResponse.members);
                        jsonResponse.members.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.members[0], 'member', ['subscriptions', 'products']);
                        should.exist(jsonResponse.members[0].subscriptions[0].price);
                        jsonResponse.members[0].name.should.equal(memberChanged.name);
                    });
            });
    });

    it('Add should fail when passing incorrect email_type query parameter', function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/?send_email=true&email_type=lel`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    it('Add should fail when comped flag is passed in but Stripe is not enabled', function () {
        const member = {
            email: 'memberTestAdd@test.com',
            comped: true
        };

        return request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422)
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);

                jsonResponse.errors[0].message.should.eql('Validation error, cannot save member.');
                jsonResponse.errors[0].context.should.match(/Missing Stripe connection./);
            });
    });

    it('Can delete a member without cancelling Stripe Subscription', async function () {
        const member = {
            name: 'Member 2 Delete',
            email: 'Member2Delete@test.com'
        };

        const createdMember = await request.post(localUtils.API.getApiQuery(`members/`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);

                return jsonResponse.members[0];
            });

        await request.delete(localUtils.API.getApiQuery(`members/${createdMember.id}/`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;

                should.exist(jsonResponse);
            });
    });

    it('Can import CSV with minimum one field and labels', function () {
        let importLabel;

        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['global-label-1', 'global-label-1'])
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/valid-members-labels.csv'))
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
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/members-with-mappings.csv'))
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
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/valid-members-defaults.csv'))
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
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/members-with-stripe-ids.csv'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(202)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.not.exist(jsonResponse.meta);
            });
    });

    it('Fails to import member with invalid values', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .field('labels', ['new-global-label'])
            .attach('membersfile', path.join(__dirname, '/../../../../utils/fixtures/csv/members-invalid-values.csv'))
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

    it('Errors when fetching stats with unknown days param value', function () {
        return request
            .get(localUtils.API.getApiQuery('members/stats/?days=nope'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });
});
