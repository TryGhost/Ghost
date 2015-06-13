/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import Ember from 'ember';
import InfiniteScrollMixin from 'ghost/mixins/infinite-scroll';

describe('InfiniteScrollMixin', function () {
    // Replace this with your real tests.
    it('works', function () {
        var InfiniteScrollObject = Ember.Object.extend(InfiniteScrollMixin),
            subject = InfiniteScrollObject.create();

        expect(subject).to.be.ok;
    });
});
