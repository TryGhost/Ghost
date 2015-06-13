/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    isEqual
} from 'ghost/helpers/is-equal';

describe('IsEqualHelper', function () {
    // Replace this with your real tests.
    it('works', function () {
        var result = isEqual([42, 42]);

        expect(result).to.be.ok;
    });
});
