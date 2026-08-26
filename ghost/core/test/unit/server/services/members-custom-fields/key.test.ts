import assert from 'node:assert/strict';
import {KEY_CHARACTERS, mintableKey} from '../../../../../core/server/services/members-custom-fields/key';

describe('Custom field key minting', function () {
    it('separates words with underscores', function () {
        assert.equal(mintableKey('Shipping address'), 'shipping_address');
    });

    it('replaces a hyphen the publisher typed', function () {
        assert.equal(mintableKey('T-Shirt size'), 't_shirt_size');
    });

    it('transliterates to ASCII', function () {
        assert.equal(mintableKey('Ünïcødé Field'), 'unicode_field');
        assert.equal(mintableKey('Привет мир'), 'privet_mir');
    });

    it('drops apostrophes rather than separating on them', function () {
        assert.equal(mintableKey("Sam's Field"), 'sams_field');
        assert.equal(mintableKey('Sam’s Field'), 'sams_field');
    });

    it('collapses runs and trims the ends', function () {
        assert.equal(mintableKey('  lots   of   space  '), 'lots_of_space');
        assert.equal(mintableKey('---leading---trailing---'), 'leading_trailing');
        assert.equal(mintableKey('a__b'), 'a_b');
    });

    // Leading and trailing separators are trimmed, so the one prototype name that
    // would otherwise survive minting cannot be spelled at all.
    it('cannot mint __proto__ under any spelling', function () {
        for (const spelling of ['__proto__', '__PROTO__', '＿＿ｐｒｏｔｏ＿＿']) {
            assert.equal(mintableKey(spelling), 'proto');
        }
    });

    it('returns empty for a name with nothing usable in it', function () {
        assert.equal(mintableKey('!!!'), '');
        assert.equal(mintableKey('🎉'), '');
        assert.equal(mintableKey(''), '');
    });

    // The charset is the contract every consumer reads a key through: NQL will not
    // parse a hyphen in a property path, an email replacement string matches word
    // characters only, and a dot would be indistinguishable from the separator in a
    // `custom_fields.<key>.<part>` CSV column. A transliteration library widening
    // what it emits has to fail here rather than downstream.
    it('mints only characters every consumer accepts', function () {
        const names = [
            'Shipping address', 'T-Shirt size', "Sam's Field", 'Ünïcødé Field',
            '½ measure', 'Привет мир', '日本語のフィールド', 'emoji 🎉 field',
            'café_naïve', '100% Sure', '£5 tier', 'A/B test',
            'a@b:c/d?e#f[g]h!i$j&k(l)m*n+o,p;q=r', 'Ω omega', 'naïve—dash', 'x​y'
        ];

        for (const name of names) {
            const key = mintableKey(name);
            assert.match(key, KEY_CHARACTERS, `minted ${JSON.stringify(key)} from ${JSON.stringify(name)}`);
        }
    });
});
