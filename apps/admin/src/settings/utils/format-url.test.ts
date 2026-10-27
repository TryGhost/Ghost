import * as assert from 'assert/strict';
import { formatUrl } from '@/settings/utils/format-url';

describe('formatUrl', function () {
  describe('trailing slash', function () {
    const baseUrl = 'https://example.com/blog/';

    it('preserves telephone URIs without adding a web path slash', function () {
      const uris = [
        'tel:+15555550100',
        'tel:+15555550100;ext=12',
        'tel:5550100;phone-context=+1-555',
        'tel:+1.555.555.0100',
      ];

      for (const uri of uris) {
        assert.deepEqual(
          formatUrl(uri, baseUrl),
          {
            save: uri,
            display: uri,
          },
          uri,
        );
      }
    });

    it('continues to add a slash to HTTP child paths', function () {
      assert.deepEqual(formatUrl('https://example.com/blog/about', baseUrl), {
        save: '/about/',
        display: 'https://example.com/blog/about/',
      });
    });
  });

  describe('subdirectory homepage', function () {
    const baseUrl = 'https://example.com/blog/';

    it('keeps the homepage when a query or fragment follows its missing slash', function () {
      const cases = [
        {
          input: 'https://example.com/blog?ref=menu',
          save: '/?ref=menu',
          display: 'https://example.com/blog/?ref=menu',
        },
        {
          input: 'https://example.com/blog#section',
          save: '/#section',
          display: 'https://example.com/blog/#section',
        },
        {
          input: 'https://example.com/blog?ref=menu#section',
          save: '/?ref=menu#section',
          display: 'https://example.com/blog/?ref=menu#section',
        },
        {
          input: '/blog?ref=menu',
          save: '/?ref=menu',
          display: 'https://example.com/blog/?ref=menu',
        },
      ];

      for (const fixture of cases) {
        assert.deepEqual(
          formatUrl(fixture.input, baseUrl),
          {
            save: fixture.save,
            display: fixture.display,
          },
          fixture.input,
        );
      }
    });

    it('saves the bare subdirectory as the homepage', function () {
      for (const input of ['https://example.com/blog', '/blog']) {
        assert.deepEqual(
          formatUrl(input, baseUrl),
          {
            save: '/',
            display: 'https://example.com/blog/',
          },
          input,
        );
      }
    });
  });
});
