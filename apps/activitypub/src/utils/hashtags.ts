const HASHTAG_NAME_PATTERN = /^[\p{L}\p{M}\p{N}_]+$/u;
const HASHTAG_TEXT_PATTERN = /^#[\p{L}\p{M}\p{N}_]+$/u;

// Matches how the server normalizes hashtags, so a name typed or clicked here
// lands on the same feed as one that came back from the API
export function normalizeHashtag(name: string): string {
  return name.normalize('NFKC').toLowerCase();
}

export function getHashtagPath(name: string): string {
  return `/hashtags/${encodeURIComponent(name)}`;
}

// Returns the hashtag name (without the leading "#") when the query reads as a
// hashtag, e.g. "#ghost", otherwise null
export function parseHashtagQuery(query: string): string | null {
  const text = query.trim();

  if (!HASHTAG_TEXT_PATTERN.test(text)) {
    return null;
  }

  return normalizeHashtag(text.slice(1));
}

// Servers mark up hashtag links differently:
// - Mastodon and Ghost: <a rel="tag" class="mention hashtag">#<span>foo</span></a>
// - Pleroma/Akkoma: <a rel="tag ugc" class="hashtag" data-tag="foo">#foo</a>
// - Misskey: <a href="https://misskey.example/tags/foo">#foo</a>
// Any one of these signals is enough. The hashtag name is the link text without
// the leading "#"
export function getHashtagFromLink(link: Element): string | null {
  const text = link.textContent?.trim() ?? '';
  const isHashtagLink =
    (link.getAttribute('rel') ?? '').split(/\s+/).includes('tag') ||
    link.classList.contains('hashtag') ||
    HASHTAG_TEXT_PATTERN.test(text);

  if (!isHashtagLink) {
    return null;
  }

  const name = text.replace(/^#/, '');

  return HASHTAG_NAME_PATTERN.test(name) ? name : null;
}

// Opens the hashtag feed in-app when a click landed on a hashtag link and
// reports whether it did, so the caller can leave other clicks alone
export function handleHashtagLinkClick(e: Event, navigate: (to: string) => void): boolean {
  const link = (e.target as Element | null)?.closest('a');
  const hashtag = link ? getHashtagFromLink(link) : null;

  if (!hashtag) {
    return false;
  }

  e.preventDefault();
  e.stopPropagation();
  navigate(getHashtagPath(hashtag));

  return true;
}
