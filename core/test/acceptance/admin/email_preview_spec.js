const should = require('should');
const supertest = require('supertest');
const ObjectId = require('bson-objectid');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../server/config');

const ghost = testUtils.startGhost;

describe('Email Preview API', function () {
    let request;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'users:extra', 'posts');
            });
    });

    describe('Read', function () {
        it('can\'t retrieve for non existent post', function (done) {
            request.get(localUtils.API.getApiQuery(`posts/${ObjectId.generate()}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.errors);
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                        'message',
                        'context',
                        'type',
                        'details',
                        'property',
                        'help',
                        'code',
                        'id'
                    ]);
                    done();
                });
        });

        it('can read post email preview with fields', function () {
            return request
                .get(localUtils.API.getApiQuery(`email_preview/posts/${testUtils.DataGenerator.Content.posts[0].id}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.email_previews);

                    localUtils.API.checkResponse(jsonResponse.email_previews[0], 'email_preview', null, null);
                });
        });
    });
});
