import assert from 'node:assert/strict';
import { resolveRecommendationUrl } from '../../../actions/resolve-recommendation-url.action';

describe('resolveRecommendationUrl', function () {
  it('maps a recommendations file to the site it belongs to', function () {
    const mapped = resolveRecommendationUrl(
      new URL('https://other.example/.well-known/recommendations.json'),
    );

    assert.equal(mapped?.href, 'https://other.example/');
  });

  it('keeps a subdirectory and the query string', function () {
    const source = new URL('https://other.example/blog/.well-known/recommendations.json?ref=a');

    assert.equal(resolveRecommendationUrl(source)?.href, 'https://other.example/blog?ref=a');
    // The URL it was handed is left as it was.
    assert.equal(source.href, 'https://other.example/blog/.well-known/recommendations.json?ref=a');
  });

  it('gives undefined for any other URL', function () {
    assert.equal(
      resolveRecommendationUrl(new URL('https://other.example/recommendations.json')),
      undefined,
    );
    assert.equal(
      resolveRecommendationUrl(new URL('https://other.example/.well-known/recommendations.json/x')),
      undefined,
    );
  });
});
