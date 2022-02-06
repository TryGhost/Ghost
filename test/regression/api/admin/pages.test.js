const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const config = require('../../../../core/shared/config');
const localUtils = require('./utils');
let request;

describe('Pages API', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'posts');
    });

    describe('Edit', function () {
        it('accepts html source', function () {
            return request
                .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[5].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    res.body.pages[0].slug.should.equal('static-page-test');

                    return request
                        .put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id + '/?source=html'))
                        .set('Origin', config.get('url'))
                        .send({
                            pages: [{
                                html: '<p>HTML Ipsum presents</p>',
                                updated_at: res.body.pages[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    res.body.pages[0].mobiledoc.should.equal('{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"HTML Ipsum presents"]]]]}');
                });
        });
    });
});
