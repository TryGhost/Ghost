const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const labs = require('../../../core/server/services/labs');

const ghost = testUtils.startGhost;

let request;

describe('Members API', function () {
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

    it('Can browse', function () {
        return request
            .get(localUtils.API.getApiQuery('members/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(3);
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');

                testUtils.API.isISO8601(jsonResponse.members[0].created_at).should.be.true();
                jsonResponse.members[0].created_at.should.be.an.instanceof(String);

                jsonResponse.meta.pagination.should.have.property('page', 1);
                jsonResponse.meta.pagination.should.have.property('limit', 15);
                jsonResponse.meta.pagination.should.have.property('pages', 1);
                jsonResponse.meta.pagination.should.have.property('total', 3);
                jsonResponse.meta.pagination.should.have.property('next', null);
                jsonResponse.meta.pagination.should.have.property('prev', null);
            });
    });

    it('Can browse with filter', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?filter=label:label-1'))
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
                localUtils.API.checkResponse(jsonResponse, 'members');
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Can browse with search', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?search=member1'))
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
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Can browse with paid', function () {
        return request
            .get(localUtils.API.getApiQuery('members/?paid=true'))
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
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Can read', function () {
        return request
            .get(localUtils.API.getApiQuery(`members/${testUtils.DataGenerator.Content.members[0].id}/`))
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
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');
            });
    });

    it('Can add', function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/`))
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

                jsonResponse.members[0].name.should.equal(member.name);
                jsonResponse.members[0].email.should.equal(member.email);
            })
            .then(() => {
                return request
                    .post(localUtils.API.getApiQuery(`members/`))
                    .send({members: [member]})
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(422);
            });
    });

    it('Can edit by id', function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2Change@test.com'
        };

        const memberChanged = {
            name: 'changed',
            email: 'cantChangeMe@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/`))
            .send({members: [memberToChange]})
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
            })
            .then((newMember) => {
                return request
                    .put(localUtils.API.getApiQuery(`members/${newMember.id}/`))
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
                        localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'stripe');
                        jsonResponse.members[0].name.should.equal(memberChanged.name);
                        jsonResponse.members[0].email.should.equal(memberChanged.email);
                        jsonResponse.members[0].email.should.not.equal(memberToChange.email);
                    });
            });
    });

    it('Can destroy', function () {
        const member = {
            name: 'test',
            email: 'memberTestDestroy@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/`))
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

                return jsonResponse.members[0];
            })
            .then((newMember) => {
                return request
                    .delete(localUtils.API.getApiQuery(`members/${newMember.id}`))
                    .set('Origin', config.get('url'))
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(204)
                    .then(() => newMember);
            })
            .then((newMember) => {
                return request
                    .get(localUtils.API.getApiQuery(`members/${newMember.id}/`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404);
            });
    });

    it('Can validate import data', function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/upload/validate`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.not.exist(jsonResponse.members);
            });
    });

    it('Fails to validate import data when stripe_customer_id is present but Stripe is not connected', function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com',
            stripe_customer_id: 'cus_XXXXX'
        };

        return request
            .post(localUtils.API.getApiQuery(`members/upload/validate`))
            .send({members: [member]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                jsonResponse.errors[0].message.should.match(/Missing Stripe connection/i);
                jsonResponse.errors[0].context.should.match(/no Stripe account connected/i);
            });
    });

    it('Can export CSV', function () {
        return request
            .get(localUtils.API.getApiQuery(`members/upload/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /text\/csv/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                res.headers['content-disposition'].should.match(/Attachment;\sfilename="members/);
                res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);
                res.text.should.match(/member1@test.com/);
                res.text.should.match(/Mr Egg/);
            });
    });

    it('Can import CSV', function () {
        return request
            .post(localUtils.API.getApiQuery(`members/upload/`))
            .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-import.csv'))
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

                jsonResponse.meta.stats.imported.count.should.equal(2);
                jsonResponse.meta.stats.invalid.count.should.equal(0);
                jsonResponse.meta.import_label.name.should.match(/^Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

                return jsonResponse.meta.import_label;
            }).then((importLabel) => {
                // check that members had the auto-generated label attached
                return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        const jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.members);
                        jsonResponse.members.should.have.length(2);
                    });
            });
    });

    it('Can fetch stats', function () {
        return request
            .get(localUtils.API.getApiQuery('members/stats/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.total);
                should.exist(jsonResponse.total_in_range);
                should.exist(jsonResponse.total_on_date);
                should.exist(jsonResponse.new_today);

                // 3 from fixtures, 2 from above posts, 2 from above import
                jsonResponse.total.should.equal(7);
            });
    });
});
