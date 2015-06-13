/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {readPath} from 'ghost/helpers/read-path';
import Ember from 'ember';

describe('ReadPathHelper', function () {
    // Replace this with your real tests.
    it('works', function () {
        var result = readPath([Ember.Object.create({hi: 'there'}), 'hi']);

        expect(result).to.equal('there');
    });
});
