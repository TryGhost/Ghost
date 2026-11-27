import { PostType } from '../../../src/api/activitypub';
import { describe, expect, test } from 'vitest';
import { getReplyBanner, getReplyParentPath } from '../../../src/utils/reply-context';

const parentAuthor = {
  name: 'Bob',
  handle: '@bob@other.example',
  url: 'https://other.example/users/bob',
};

describe('getReplyBanner', function () {
  test('returns null when the post is not a reply', function () {
    expect(getReplyBanner(null, '@alice@fake.host')).toBeNull();
    expect(getReplyBanner(undefined, '@alice@fake.host')).toBeNull();
  });

  test('names the parent author when the handle differs from the note author', function () {
    expect(
      getReplyBanner({ id: 'p', type: PostType.Note, author: parentAuthor }, '@alice@fake.host'),
    ).toEqual({
      kind: 'named',
      name: 'Bob',
    });
  });

  test('falls back to the handle when the parent name is empty', function () {
    expect(
      getReplyBanner(
        { id: 'p', type: PostType.Note, author: { ...parentAuthor, name: '  ' } },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'named', name: '@bob@other.example' });
  });

  test('shows "continuing" when the parent author handle matches the note author', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: { ...parentAuthor, handle: '@alice@fake.host' },
        },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'continuing' });
  });

  test('compares handles case-insensitively and ignores surrounding whitespace', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: { ...parentAuthor, handle: ' @Alice@Fake.Host ' },
        },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'continuing' });
  });

  test('never compares URLs, even when they match', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: { ...parentAuthor, url: 'https://fake.host/users/alice' },
        },
        '@alice@fake.host',
      ),
    ).toMatchObject({ kind: 'named', name: 'Bob' });
  });

  test('uses the generic label when the parent author is null', function () {
    expect(
      getReplyBanner({ id: 'p', type: PostType.Note, author: null }, '@alice@fake.host'),
    ).toEqual({ kind: 'generic' });
  });

  test('does not treat placeholder handles as the same author', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: { ...parentAuthor, handle: '@unknown@unknown' },
        },
        '@unknown@unknown',
      ),
    ).toEqual({ kind: 'named', name: 'Bob' });
  });

  test('does not treat empty handles as the same author', function () {
    expect(
      getReplyBanner({ id: 'p', type: PostType.Note, author: { ...parentAuthor, handle: '' } }, ''),
    ).toEqual({ kind: 'named', name: 'Bob' });
  });

  test('rejects incomplete and partial-placeholder handles for identity', function () {
    for (const bad of ['@alice@unknown', '@alice', 'alice', '@unknown@unknown']) {
      expect(
        getReplyBanner(
          {
            id: 'p',
            type: PostType.Note,
            author: { name: 'Alice', handle: bad, url: 'https://example.com/users/alice' },
          },
          bad,
        ),
      ).toEqual({ kind: 'named', name: 'Alice' });
    }
  });

  test('allows a legitimate username of "unknown" on a real host', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: {
            name: 'Unknown',
            handle: '@unknown@example.com',
            url: 'https://example.com/users/unknown',
          },
        },
        '@unknown@example.com',
      ),
    ).toEqual({ kind: 'continuing' });

    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: {
            name: 'Unknown',
            handle: '@unknown@example.com',
            url: 'https://example.com/users/unknown',
          },
        },
        '@alice@fake.host',
      ),
    ).toEqual({
      kind: 'named',
      name: 'Unknown',
    });
  });

  test('uses the generic label when neither a name nor a usable handle is available', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
          type: PostType.Note,
          author: { ...parentAuthor, name: '', handle: '@unknown@unknown' },
        },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'generic' });
    expect(
      getReplyBanner(
        { id: 'p', type: PostType.Note, author: { ...parentAuthor, name: '', handle: '' } },
        null,
      ),
    ).toEqual({ kind: 'generic' });
    expect(
      getReplyBanner(
        { id: 'p', type: PostType.Note, author: { name: '', handle: '@alice@unknown', url: '' } },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'generic' });
  });
});

describe('getReplyParentPath', function () {
  test('routes notes to /notes and articles to /reader', function () {
    expect(getReplyParentPath({ id: 'https://x/n', type: PostType.Note, author: null }, 'c')).toBe(
      `/notes/${encodeURIComponent('https://x/n')}`,
    );
    expect(
      getReplyParentPath({ id: 'https://x/a', type: PostType.Article, author: null }, 'c'),
    ).toBe(`/reader/${encodeURIComponent('https://x/a')}`);
  });

  test('routes soft-deleted and unknown-type parents to the current reply thread', function () {
    expect(
      getReplyParentPath(
        { id: 'https://x/deleted', type: PostType.Tombstone, author: null },
        'https://x/reply',
      ),
    ).toBe(`/notes/${encodeURIComponent('https://x/reply')}`);

    expect(
      getReplyParentPath({ id: 'https://x/remote', type: null, author: null }, 'https://x/reply'),
    ).toBe(`/notes/${encodeURIComponent('https://x/reply')}`);
  });
});
