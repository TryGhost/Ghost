/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import Ember from 'ember';
import InfiniteScrollMixin from 'ghost-admin/mixins/infinite-scroll';

const {
    Object: EmberObject
} = Ember;

describe('Unit: Mixin: infinite-scroll', function () {
    // Replace this with your real tests.
    it('works', function () {
        let InfiniteScrollObject = EmberObject.extend(InfiniteScrollMixin);
        let subject = InfiniteScrollObject.create();

        expect(subject).to.be.ok;
    });
});
