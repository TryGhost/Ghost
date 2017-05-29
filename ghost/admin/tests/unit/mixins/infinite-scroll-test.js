/* jshint expr:true */
import EmberObject from 'ember-object';
import InfiniteScrollMixin from 'ghost-admin/mixins/infinite-scroll';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';

describe('Unit: Mixin: infinite-scroll', function () {
    // Replace this with your real tests.
    it('works', function () {
        let InfiniteScrollObject = EmberObject.extend(InfiniteScrollMixin);
        let subject = InfiniteScrollObject.create();

        expect(subject).to.be.ok;
    });
});
