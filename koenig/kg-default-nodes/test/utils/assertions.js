const Prettier = require('prettier');
const chai = require('chai');
const expect = chai.expect;
const minify = require('html-minifier').minify;

should.Assertion.add('prettifyTo', function (str) {
    const minifiedExpected = minify(str, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const expectedStr = Prettier.format(minifiedExpected, {parser: 'html'});

    this.params = {
        operator: 'to prettify to `' + str + '`',
        expected: expectedStr,
        showDiff: true
    };

    this.obj.should.be.a.String;
    const minified = minify(this.obj, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const result = Prettier.format(minified, {parser: 'html'});
    expect(result).to.equal(expectedStr);
}, false);
