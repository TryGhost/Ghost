/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import EmberObject from 'ember-object';
import InfiniteScrollMixin from 'ghost-admin/mixins/infinite-scroll';

describe('Unit: Mixin: infinite-scroll', function () {
    // Replace this with your real tests.
    it('works', function () {
        let InfiniteScrollObject = EmberObject.extend(InfiniteScrollMixin);
        let subject = InfiniteScrollObject.create();

        expect(subject).to.be.ok;
    });
});
