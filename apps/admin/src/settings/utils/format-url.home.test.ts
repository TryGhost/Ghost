import * as assert from 'assert/strict';
import { formatUrl } from '@/settings/utils/format-url';

describe('formatUrl', function () {
  it('keeps the subdirectory homepage when a query or fragment follows its missing slash', function () {
    const baseUrl = 'https://example.com/blog/';
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
});
