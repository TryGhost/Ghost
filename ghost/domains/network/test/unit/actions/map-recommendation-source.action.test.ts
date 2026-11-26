import assert from 'node:assert/strict';
import { mapRecommendationSource } from '../../../actions/map-recommendation-source.action';

describe('Map recommendation source action', function () {
  it("gives the site's own address for its recommendations file", function () {
    const mapped = mapRecommendationSource(
      new URL('https://other.example/blog/.well-known/recommendations.json'),
    );

    assert.equal(mapped?.href, 'https://other.example/blog');
  });

  it('gives nothing for any other address, so the mention is described as it is', function () {
    assert.equal(mapRecommendationSource(new URL('https://other.example/a-post/')), undefined);
  });

  it('leaves the address it was given unchanged', function () {
    const url = new URL('https://other.example/.well-known/recommendations.json');

    mapRecommendationSource(url);

    assert.equal(url.pathname, '/.well-known/recommendations.json');
  });
});
