/**
 * Custom Should Assertions
 *
 * Add any custom assertions to this file.
 */

// Example Assertion
// should.Assertion.add('ExampleAssertion', function () {
//     this.params = {operator: 'to be a valid Example Assertion'};
//     this.obj.should.be.an.Object;
// });

const Prettier = require('prettier');

should.Assertion.add('prettifyTo', function (str) {
    this.params = {
        operator: 'to prettify to `' + str + '`',
        expected: str,
        showDiff: true
    };

    this.obj.should.be.a.String;
    const result = Prettier.format(this.obj, {parser: 'html'});
    result.should.equal(str);
}, false);
