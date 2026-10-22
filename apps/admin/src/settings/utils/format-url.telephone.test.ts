import * as assert from 'assert/strict';
import { formatUrl } from '@/settings/utils/format-url';

describe('formatUrl', function () {
  it('preserves telephone URIs without adding a web path slash', function () {
    const baseUrl = 'https://example.com/blog/';
    const uris = [
      'tel:+15555550100',
      'tel:+15555550100;ext=12',
      'tel:5550100;phone-context=+1-555',
      'tel:+1.555.555.0100',
    ];

    for (const uri of uris) {
      assert.deepEqual(formatUrl(uri, baseUrl), {
        save: uri,
        display: uri,
      });
    }
  });

  it('continues to add a slash to HTTP child paths', function () {
    assert.deepEqual(formatUrl('https://example.com/blog/about', 'https://example.com/blog/'), {
      save: '/about/',
      display: 'https://example.com/blog/about/',
    });
  });
});
