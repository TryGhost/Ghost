const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');

describe('Snippets API', function () {
    let request;

    after(function () {
        sinon.restore();
    });

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'snippets');
    });

    it('Can add', async function () {
        const snippet = {
            name: 'test',
            // TODO: validate mobiledoc document
            mobiledoc: JSON.stringify({})
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`snippets/`))
            .send({snippets: [snippet]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.snippets);

        jsonResponse.snippets.should.have.length(1);
        jsonResponse.snippets[0].name.should.equal(snippet.name);
        jsonResponse.snippets[0].mobiledoc.should.equal(snippet.mobiledoc);

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('snippets/')}${res.body.snippets[0].id}/`);
    });

    it('Can browse', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('snippets/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.snippets);
        // 1 from fixtures and 1 from "Can add" above
        jsonResponse.snippets.should.have.length(2);
        localUtils.API.checkResponse(jsonResponse.snippets[0], 'snippet');

        // created in "Can add" above, individual tests are not idempotent
        jsonResponse.snippets[1].name.should.eql('test');

        testUtils.API.isISO8601(jsonResponse.snippets[0].created_at).should.be.true();
        jsonResponse.snippets[0].created_at.should.be.an.instanceof(String);

        jsonResponse.meta.pagination.should.have.property('page', 1);
        jsonResponse.meta.pagination.should.have.property('limit', 15);
        jsonResponse.meta.pagination.should.have.property('pages', 1);
        jsonResponse.meta.pagination.should.have.property('total', 2);
        jsonResponse.meta.pagination.should.have.property('next', null);
        jsonResponse.meta.pagination.should.have.property('prev', null);
    });

    it('Can read', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`snippets/${testUtils.DataGenerator.Content.snippets[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.snippets);
        jsonResponse.snippets.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.snippets[0], 'snippet');
    });

    it('Can edit', async function () {
        const snippetToChange = {
            name: 'change me',
            mobiledoc: '{}'
        };

        const snippetChanged = {
            name: 'changed',
            mobiledoc: '{}'
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`snippets/`))
            .send({snippets: [snippetToChange]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.snippets);
        jsonResponse.snippets.should.have.length(1);

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('snippets/')}${res.body.snippets[0].id}/`);

        const newsnippet = jsonResponse.snippets[0];

        const res2 = await request
            .put(localUtils.API.getApiQuery(`snippets/${newsnippet.id}/`))
            .send({snippets: [snippetChanged]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res2.headers['x-cache-invalidate']);

        const jsonResponse2 = res2.body;

        should.exist(jsonResponse2);
        should.exist(jsonResponse2.snippets);
        jsonResponse2.snippets.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse2.snippets[0], 'snippet');
        jsonResponse2.snippets[0].name.should.equal(snippetChanged.name);
        jsonResponse2.snippets[0].mobiledoc.should.equal(snippetChanged.mobiledoc);
    });

    it('Can destroy', async function () {
        const snippet = {
            name: 'destroy test',
            mobiledoc: '{}'
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`snippets/`))
            .send({snippets: [snippet]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);

        const jsonResponse = res.body;

        should.exist(jsonResponse);
        should.exist(jsonResponse.snippets);

        const newSnippet = jsonResponse.snippets[0];

        await request
            .delete(localUtils.API.getApiQuery(`snippets/${newSnippet.id}`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);

        await request
            .get(localUtils.API.getApiQuery(`snippets/${newSnippet.id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });
});
