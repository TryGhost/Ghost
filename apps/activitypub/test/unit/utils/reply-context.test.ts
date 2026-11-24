import { describe, expect, test } from 'vitest';
import { getReplyBanner } from '../../../src/utils/reply-context';

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
    expect(getReplyBanner({ id: 'p', author: parentAuthor }, '@alice@fake.host')).toEqual({
      kind: 'named',
      name: 'Bob',
      handle: '@bob@other.example',
    });
  });

  test('falls back to the handle when the parent name is empty', function () {
    expect(
      getReplyBanner({ id: 'p', author: { ...parentAuthor, name: '  ' } }, '@alice@fake.host'),
    ).toEqual({ kind: 'named', name: '@bob@other.example', handle: '@bob@other.example' });
  });

  test('shows "continuing" when the parent author handle matches the note author', function () {
    expect(
      getReplyBanner(
        { id: 'p', author: { ...parentAuthor, handle: '@alice@fake.host' } },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'continuing' });
  });

  test('compares handles case-insensitively and ignores surrounding whitespace', function () {
    expect(
      getReplyBanner(
        { id: 'p', author: { ...parentAuthor, handle: ' @Alice@Fake.Host ' } },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'continuing' });
  });

  test('never compares URLs, even when they match', function () {
    expect(
      getReplyBanner(
        { id: 'p', author: { ...parentAuthor, url: 'https://fake.host/users/alice' } },
        '@alice@fake.host',
      ),
    ).toMatchObject({ kind: 'named', name: 'Bob' });
  });

  test('uses the generic label when the parent author is null', function () {
    expect(getReplyBanner({ id: 'p', author: null }, '@alice@fake.host')).toEqual({
      kind: 'generic',
    });
  });

  test('does not treat placeholder handles as the same author', function () {
    expect(
      getReplyBanner(
        { id: 'p', author: { ...parentAuthor, handle: '@unknown@unknown' } },
        '@unknown@unknown',
      ),
    ).toEqual({ kind: 'named', name: 'Bob', handle: null });
  });

  test('does not treat empty handles as the same author', function () {
    expect(getReplyBanner({ id: 'p', author: { ...parentAuthor, handle: '' } }, '')).toEqual({
      kind: 'named',
      name: 'Bob',
      handle: null,
    });
  });

  test('rejects incomplete and partial-placeholder handles for identity and links', function () {
    for (const bad of ['@alice@unknown', '@alice', 'alice', '@unknown@unknown']) {
      expect(
        getReplyBanner(
          {
            id: 'p',
            author: { name: 'Alice', handle: bad, url: 'https://example.com/users/alice' },
          },
          bad,
        ),
      ).toEqual({ kind: 'named', name: 'Alice', handle: null });
    }
  });

  test('allows a legitimate username of "unknown" on a real host', function () {
    expect(
      getReplyBanner(
        {
          id: 'p',
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
      handle: '@unknown@example.com',
    });
  });

  test('uses the generic label when neither a name nor a usable handle is available', function () {
    expect(
      getReplyBanner(
        { id: 'p', author: { ...parentAuthor, name: '', handle: '@unknown@unknown' } },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'generic' });
    expect(
      getReplyBanner({ id: 'p', author: { ...parentAuthor, name: '', handle: '' } }, null),
    ).toEqual({ kind: 'generic' });
    expect(
      getReplyBanner(
        { id: 'p', author: { name: '', handle: '@alice@unknown', url: '' } },
        '@alice@fake.host',
      ),
    ).toEqual({ kind: 'generic' });
  });
});
