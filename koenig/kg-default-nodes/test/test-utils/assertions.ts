import assert from 'node:assert/strict';
import should from 'should';
import Prettier from '@prettier/sync';
import {minify} from 'html-minifier';

(should as unknown as {Assertion: {add(name: string, fn: (this: should.Assertion, str: string) => void): void}}).Assertion.add('prettifyTo', function (this: should.Assertion, str: string) {
    const minifiedExpected = minify(str, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const expectedStr = Prettier.format(minifiedExpected, {parser: 'html'});

    (this as should.Assertion & {params: unknown}).params = {
        operator: 'to prettify to `' + str + '`',
        expected: expectedStr,
        showDiff: true
    };

    const assertion = this as should.Assertion & {obj: unknown};
    assert.equal(typeof assertion.obj, 'string');
    const minified = minify(assertion.obj as string, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const result = Prettier.format(minified, {parser: 'html'});
    assert.equal(result, expectedStr);
});
