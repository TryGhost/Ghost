import assert from 'assert/strict';
import {
  Recommendation,
  WellknownService,
} from '../../../../../../core/server/services/recommendations/service';

describe('WellknownService', function () {
  const service = new WellknownService({
    urlUtils: {
      relativeToAbsolute(url: string) {
        return 'https://example.com' + url;
      },
    },
  });

  it('Can serialize recommendations', function () {
    const recommendations = [
      Recommendation.create({
        title: 'My Blog',
        description: null,
        excerpt: null,
        featuredImage: null,
        favicon: null,
        url: 'https://example.com/blog',
        oneClickSubscribe: false,
        createdAt: new Date('2021-01-01T00:00:00Z'),
        updatedAt: new Date('2021-02-01T00:00:00Z'),
      }),
      Recommendation.create({
        title: 'My Other Blog',
        description: null,
        excerpt: null,
        featuredImage: null,
        favicon: null,
        url: 'https://example.com/blog2',
        oneClickSubscribe: false,
        createdAt: new Date('2021-01-01T00:00:00Z'),
        updatedAt: null,
      }),
    ];

    assert.equal(
      service.serialize(recommendations),
      '[{"url":"https://example.com/blog","updated_at":"2021-02-01T00:00:00.000Z","created_at":"2021-01-01T00:00:00.000Z"},{"url":"https://example.com/blog2","updated_at":"2021-01-01T00:00:00.000Z","created_at":"2021-01-01T00:00:00.000Z"}]',
    );
    assert.equal(service.serialize([]), '[]');
  });

  it('Can get URL', async function () {
    assert.equal(
      (await service.getURL()).toString(),
      'https://example.com/.well-known/recommendations.json',
    );
  });
});
