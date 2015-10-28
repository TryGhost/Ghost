/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import Ember from 'ember';
import InfiniteScrollMixin from 'ghost/mixins/infinite-scroll';

describe('Unit: Mixin: infinite-scroll', function () {
    // Replace this with your real tests.
    it('works', function () {
        let InfiniteScrollObject = Ember.Object.extend(InfiniteScrollMixin);
        let subject = InfiniteScrollObject.create();

        expect(subject).to.be.ok;
    });
});
