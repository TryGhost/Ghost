/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    isNot
} from 'ghost/helpers/is-not';

describe('Unit: Helper: is-not', function () {
    // Replace this with your real tests.
    it('works', function () {
        let result = isNot(false);

        expect(result).to.be.ok;
    });
});
