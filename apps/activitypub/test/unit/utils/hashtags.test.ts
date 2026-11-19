/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';

import {
  getHashtagFromLink,
  getHashtagPath,
  handleHashtagLinkClick,
  normalizeHashtag,
  parseHashtagQuery,
} from '../../../src/utils/hashtags';

function renderLink(html: string): HTMLAnchorElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.querySelector('a') as HTMLAnchorElement;
}

describe('hashtags', function () {
  describe('getHashtagFromLink', function () {
    it('detects Mastodon and Ghost hashtag links', function () {
      const link = renderLink(
        '<a href="https://example.com/tag/foo/" class="mention hashtag" rel="tag">#<span>foo</span></a>',
      );

      expect(getHashtagFromLink(link)).toBe('foo');
    });

    it('detects Pleroma and Akkoma hashtag links', function () {
      const link = renderLink(
        '<a href="https://pleroma.example/tag/foo" class="hashtag" data-tag="foo" rel="tag ugc">#foo</a>',
      );

      expect(getHashtagFromLink(link)).toBe('foo');
    });

    it('detects Misskey hashtag links by their text', function () {
      const link = renderLink('<a href="https://misskey.example/tags/foo">#foo</a>');

      expect(getHashtagFromLink(link)).toBe('foo');
    });

    it('detects a link marked with rel="tag" when the text has no leading #', function () {
      const link = renderLink('<a href="https://example.com/tag/foo/" rel="tag">foo</a>');

      expect(getHashtagFromLink(link)).toBe('foo');
    });

    it('detects a link marked with the hashtag class alone', function () {
      const link = renderLink('<a href="https://example.com/tag/foo/" class="hashtag">#foo</a>');

      expect(getHashtagFromLink(link)).toBe('foo');
    });

    it('keeps the casing of the link text', function () {
      const link = renderLink('<a href="https://example.com/tags/GhostCMS">#GhostCMS</a>');

      expect(getHashtagFromLink(link)).toBe('GhostCMS');
    });

    it('supports letters, marks and numbers from any script', function () {
      expect(getHashtagFromLink(renderLink('<a href="https://x.example/t/café">#café</a>'))).toBe(
        'café',
      );
      expect(
        getHashtagFromLink(renderLink('<a href="https://x.example/t/日本語">#日本語</a>')),
      ).toBe('日本語');
      expect(getHashtagFromLink(renderLink('<a href="https://x.example/t/a_1">#a_1</a>'))).toBe(
        'a_1',
      );
    });

    it('ignores regular links', function () {
      expect(
        getHashtagFromLink(renderLink('<a href="https://example.com">Example</a>')),
      ).toBeNull();
      expect(
        getHashtagFromLink(
          renderLink(
            '<a href="https://example.com/@foo" class="u-url mention" data-profile="@foo@example.com">@<span>foo</span></a>',
          ),
        ),
      ).toBeNull();
    });

    it('ignores hashtag-like links whose text is not a valid hashtag name', function () {
      expect(
        getHashtagFromLink(renderLink('<a href="https://example.com" rel="tag">#foo bar</a>')),
      ).toBeNull();
      expect(
        getHashtagFromLink(renderLink('<a href="https://example.com" rel="tag">#</a>')),
      ).toBeNull();
      expect(
        getHashtagFromLink(renderLink('<a href="https://example.com" class="hashtag">##foo</a>')),
      ).toBeNull();
    });
  });

  describe('parseHashtagQuery', function () {
    it('returns the normalized hashtag name for a hashtag query', function () {
      expect(parseHashtagQuery('#foo')).toBe('foo');
      expect(parseHashtagQuery('  #Foo  ')).toBe('foo');
    });

    it('returns null for queries that are not a single hashtag', function () {
      expect(parseHashtagQuery('foo')).toBeNull();
      expect(parseHashtagQuery('#')).toBeNull();
      expect(parseHashtagQuery('# foo')).toBeNull();
      expect(parseHashtagQuery('#foo bar')).toBeNull();
      expect(parseHashtagQuery('##foo')).toBeNull();
      expect(parseHashtagQuery('@foo@example.com')).toBeNull();
    });
  });

  describe('normalizeHashtag', function () {
    it('applies NFKC normalization and lowercases', function () {
      expect(normalizeHashtag('GhostCMS')).toBe('ghostcms');
      expect(normalizeHashtag('ＦＯＯ')).toBe('foo');
    });
  });

  describe('getHashtagPath', function () {
    it('builds the hashtag route and encodes the name', function () {
      expect(getHashtagPath('foo')).toBe('/hashtags/foo');
      expect(getHashtagPath('café')).toBe('/hashtags/caf%C3%A9');
    });
  });

  describe('handleHashtagLinkClick', function () {
    function click(html: string, selector: string) {
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);

      const navigate = vi.fn();
      const handler = (e: Event) => handleHashtagLinkClick(e, navigate);
      container.addEventListener('click', handler);

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      container.querySelector(selector)!.dispatchEvent(event);

      container.remove();

      return { event, navigate };
    }

    it('navigates to the hashtag view and cancels the link', function () {
      const { event, navigate } = click(
        '<a href="https://example.com/tag/foo/" rel="tag">#<span>foo</span></a>',
        'span',
      );

      expect(navigate).toHaveBeenCalledWith('/hashtags/foo');
      expect(event.defaultPrevented).toBe(true);
    });

    it('leaves other links alone', function () {
      const { event, navigate } = click('<a href="https://example.com">Example</a>', 'a');

      expect(navigate).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('leaves clicks outside of links alone', function () {
      const { event, navigate } = click('<p>#foo</p>', 'p');

      expect(navigate).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
