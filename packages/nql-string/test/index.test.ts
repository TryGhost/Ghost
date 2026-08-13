import assert from 'node:assert/strict';
import nql from '@tryghost/nql';
import {describe, it} from 'vitest';
import {escapeNqlString} from '../src/index.ts';

describe('escapeNqlString', function () {
    it('escapes single quotes', function () {
        assert.equal(escapeNqlString('can\'t stop'), '\'can\\\'t stop\'');
    });

    it('escapes double quotes', function () {
        // the NQL lexer rejects a bare " inside a single-quoted string
        assert.equal(escapeNqlString('say "hi"'), String.raw`'say \"hi\"'`);
    });

    it('does not double backslashes', function () {
        // NQL's string rule matches a lone backslash as an ordinary body
        // character - there is no `\\` escape, so doubling would query a
        // different value
        assert.equal(escapeNqlString('a\\b'), '\'a\\b\'');
    });

    // the escaping is only useful if it round-trips exactly and cannot be used
    // to smuggle in extra filter conditions
    [
        'simple',
        'can\'t stop',
        'say "hi"',
        'both\'and"quotes',
        'trailing quote\'',
        'trailing backslash \\',
        'backslash quote \\\'',
        'x\',status:paid',
        'x\\\',status:paid',
        '\'\'',
        '\\',
        'https://example.com/foo-bar-baz/\'',
        'The "Best" Guide',
        '25" monitor'
    ].forEach(function (value) {
        it(`round-trips ${JSON.stringify(value)} without injection`, function () {
            const query = nql(`post_id:'abc'+to:${escapeNqlString(value)}`);
            const parsed = query.parse();

            assert.ok(parsed.$and, 'parsed into a conjunction');
            assert.equal(parsed.$and.length, 2, 'no extra conditions');

            const [, toCondition] = parsed.$and;
            assert.equal(toCondition?.to, value, 'selects the exact value');

            // and the filter actually matches the value it was built from,
            // rather than merely parsing into the right shape
            assert.equal(query.queryJSON({post_id: 'abc', to: value}), true, 'matches the exact value');
            assert.equal(query.queryJSON({post_id: 'abc', to: `${value}x`}), false, 'does not match other values');
        });
    });

    it('cannot encode an empty value', function () {
        // NQL's string rule requires at least one character, so `''` does not
        // lex - callers must not pass an empty value. Pinned here so a future
        // nql version relaxing this is a visible change rather than a surprise.
        assert.throws(() => nql(`to:${escapeNqlString('')}`).parse());
    });
});
