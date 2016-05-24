/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    isEqual
} from 'ghost-admin/helpers/is-equal';

describe('Unit: Helper: is-equal', function () {
    // Replace this with your real tests.
    it('works', function () {
        let result = isEqual([42, 42]);

        expect(result).to.be.ok;
    });
});
