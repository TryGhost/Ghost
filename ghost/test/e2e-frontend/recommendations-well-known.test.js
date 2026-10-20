const assert = require('node:assert/strict');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const recommendationsService = require('../../core/server/services/recommendations');
const { Recommendation } = require('../../core/server/services/recommendations/service');

describe('Recommendations well-known file', function () {
  let request;

  beforeAll(async function () {
    await testUtils.startGhost();
    request = supertest.agent(configUtils.config.get('url'));
  });

  afterAll(async function () {
    await testUtils.stopGhost();
  });

  afterEach(async function () {
    for (const recommendation of await recommendationsService.repository.getAll()) {
      recommendation.delete();
      await recommendationsService.repository.save(recommendation);
    }
  });

  async function addRecommendation() {
    const recommendation = Recommendation.create({
      title: 'Recommended site',
      description: null,
      excerpt: null,
      featuredImage: null,
      favicon: null,
      url: new URL('https://recommended.example.com/'),
      oneClickSubscribe: false,
      createdAt: new Date('2021-01-01T00:00:00.000Z'),
    });
    await recommendationsService.repository.save(recommendation);
    return recommendationsService.repository.getById(recommendation.id);
  }

  it('serves the recommendations stored in the database', async function () {
    const recommendation = await addRecommendation();

    const res = await request.get('/.well-known/recommendations.json').expect(200);

    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(res.headers['cache-control'], 'public, max-age=0');
    assert.equal(
      res.text,
      JSON.stringify([
        {
          url: 'https://recommended.example.com/',
          updated_at: recommendation.updatedAt.toISOString(),
          created_at: recommendation.createdAt.toISOString(),
        },
      ]),
    );
  });

  it('stops listing a recommendation once it is deleted', async function () {
    const recommendation = await addRecommendation();
    const before = await request.get('/.well-known/recommendations.json').expect(200);
    assert.ok(before.text.includes(JSON.stringify('https://recommended.example.com/')));

    recommendation.delete();
    await recommendationsService.repository.save(recommendation);

    const after = await request.get('/.well-known/recommendations.json').expect(200);
    assert.equal(after.text, '[]');
  });

  it('responds 304 only while the list is unchanged', async function () {
    const recommendation = await addRecommendation();
    const { headers } = await request.get('/.well-known/recommendations.json').expect(200);

    await request
      .get('/.well-known/recommendations.json')
      .set('If-None-Match', headers.etag)
      .expect(304);

    recommendation.delete();
    await recommendationsService.repository.save(recommendation);

    await request
      .get('/.well-known/recommendations.json')
      .set('If-None-Match', headers.etag)
      .expect(200);
  });
});
