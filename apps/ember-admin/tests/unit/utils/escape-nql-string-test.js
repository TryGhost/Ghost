import nql from '@tryghost/nql';
import {describe, it} from 'mocha';
import {escapeNqlString} from 'ghost-admin/utils/escape-nql-string';
import {expect} from 'chai';

describe('Unit | Utility | escape-nql-string', function () {
    it('escapes single quotes and wraps in quotes', function () {
        expect(escapeNqlString(`pat's tag`)).to.equal(`'pat\\'s tag'`);
    });

    it('does not double backslashes', function () {
        // NQL has no backslash escape - `\\` in a filter means two literal
        // backslashes, so doubling would corrupt terms containing a backslash
        expect(escapeNqlString(`a\\b`)).to.equal(`'a\\b'`);
    });

    // the NQL lexer only supports `\'`/`\"` escapes and reads lone backslashes
    // literally, so quote-only escaping must round-trip any term exactly
    // without allowing breakout into additional filter conditions
    const nastyTerms = [
        `simple`,
        `pat's tag`,
        `a\\b`,
        `trailing backslash \\`,
        `backslash quote \\'`,
        `x',foo:1`,
        `x\\',foo:1`,
        `''`,
        `\\`
    ];

    nastyTerms.forEach((term) => {
        it(`round-trips ${JSON.stringify(term)} through NQL without injection`, function () {
            const filter = nql(`name:${escapeNqlString(term)}`);

            expect(Object.keys(filter.parse()), 'parsed filter keys').to.deep.equal(['name']);
            expect(filter.queryJSON({name: term}), 'matches the exact term').to.be.true;
            expect(filter.queryJSON({name: `${term}x`}), 'does not match other values').to.be.false;
        });
    });
});
