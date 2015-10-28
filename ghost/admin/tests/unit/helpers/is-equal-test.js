/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    isEqual
} from 'ghost/helpers/is-equal';

describe('Unit: Helper: is-equal', function () {
    // Replace this with your real tests.
    it('works', function () {
        const result = isEqual([42, 42]);

        expect(result).to.be.ok;
    });
});
