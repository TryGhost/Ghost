/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    isNot
} from 'ghost/helpers/is-not';

describe('IsNotHelper', function () {
    // Replace this with your real tests.
    it('works', function () {
        var result = isNot(false);

        expect(result).to.be.ok;
    });
});
