import assert from 'node:assert/strict';
import { PORT_FIELD } from '@tryghost/checkout';
import { isSlug, mintSlug, slugSchema } from '../../../../core/server/lib/slug';

// The API suites reach the slug format through the slugs they mint and, for hyphen slugs, through
// the slugs requests give. This pins the format itself, for both separators, and the schema that
// reads a string from outside with it.
describe('Slug format', function () {
  it.each([
    {
      separator: '_' as const,
      slugs: ['a', 'vip', 'shipping_address', 'a1_2b'],
      others: ['', '_vip', 'vip_', 'a__b', 'a-b', 'VIP', 'café', 'a b', 'a\n'],
    },
    {
      separator: '-' as const,
      slugs: ['a', 'vip', 'all-paid', 'a1-2b'],
      others: ['', '-vip', 'vip-', 'a--b', 'a_b', 'VIP', 'café', 'a b', 'a\n'],
    },
  ])('accepts slugs with $separator and nothing else', function ({ separator, slugs, others }) {
    for (const slug of slugs) {
      assert.equal(isSlug(slug, separator), true, slug);
    }
    for (const other of others) {
      assert.equal(isSlug(other, separator), false, JSON.stringify(other));
    }
  });

  it('reads a string from outside as a slug, or says what a slug can contain', function () {
    assert.equal(slugSchema('-').parse('all-paid'), 'all-paid');

    const result = slugSchema('_').safeParse('all-paid');
    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues[0].message,
      'Slug can only contain lowercase letters and digits, in words joined by single underscores',
    );
  });
});

// Minted with the underscore a custom field's key has between its words.
describe('Slug minting', function () {
  it('separates words with underscores', function () {
    assert.equal(mintSlug('Shipping address', '_'), 'shipping_address');
  });

  it('replaces a hyphen the publisher typed', function () {
    assert.equal(mintSlug('T-Shirt size', '_'), 't_shirt_size');
  });

  it('transliterates to ASCII', function () {
    assert.equal(mintSlug('Ünïcødé Field', '_'), 'unicode_field');
    assert.equal(mintSlug('Привет мир', '_'), 'privet_mir');
  });

  it('drops apostrophes rather than separating on them', function () {
    assert.equal(mintSlug("Sam's Field", '_'), 'sams_field');
    assert.equal(mintSlug('Sam’s Field', '_'), 'sams_field');
  });

  it('collapses runs and trims the ends', function () {
    assert.equal(mintSlug('  lots   of   space  ', '_'), 'lots_of_space');
    assert.equal(mintSlug('---leading---trailing---', '_'), 'leading_trailing');
    assert.equal(mintSlug('a__b', '_'), 'a_b');
  });

  // Leading and trailing separators are trimmed, so the one prototype name that
  // would otherwise survive minting cannot be spelled at all.
  it('cannot mint __proto__ under any spelling', function () {
    for (const spelling of ['__proto__', '__PROTO__', '＿＿ｐｒｏｔｏ＿＿']) {
      assert.equal(mintSlug(spelling, '_'), 'proto');
    }
  });

  it('returns nothing for a name with nothing usable in it', function () {
    assert.equal(mintSlug('!!!', '_'), undefined);
    assert.equal(mintSlug('🎉', '_'), undefined);
    assert.equal(mintSlug('', '_'), undefined);
  });

  // A slug's characters are guaranteed by its type, so what this holds is that minting
  // still finds something usable in the names publishers write. A transliteration
  // library that stops handling a script fails here, rather than leaving publishers
  // unable to add a field named in it.
  it('mints a slug from any name with something usable in it', function () {
    const names = [
      'Shipping address',
      'T-Shirt size',
      "Sam's Field",
      'Ünïcødé Field',
      '½ measure',
      'Привет мир',
      '日本語のフィールド',
      'emoji 🎉 field',
      'café_naïve',
      '100% Sure',
      '£5 tier',
      'A/B test',
      'a@b:c/d?e#f[g]h!i$j&k(l)m*n+o,p;q=r',
      'Ω omega',
      'naïve—dash',
      'x​y',
    ];

    for (const name of names) {
      assert.notEqual(
        mintSlug(name, '_'),
        undefined,
        `minted nothing from ${JSON.stringify(name)}`,
      );
    }
  });

  it('mints each checkout port default key from that port default name', function () {
    for (const [port, field] of Object.entries(PORT_FIELD)) {
      assert.equal(mintSlug(field.name, '_'), field.key, `port ${port}`);
    }
  });
});
