// import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
// import EmberObject from 'ember-object';
// import ValidationEngineMixin from 'ghost-admin/mixins/validation-engine';

describe('ValidationEngineMixin', function () {
    describe('#validate', function () {
        it('loads the correct validator');
        it('rejects if the validator doesn\'t exist');
        it('resolves with valid object');
        it('rejects with invalid object');
        it('clears all existing errors');

        describe('with a specified property', function () {
            it('resolves with valid property');
            it('rejects with invalid property');
            it('adds property to hasValidated array');
            it('clears existing error on specified property');
        });

        it('handles a passed in model');
        it('uses this.model if available');
    });

    describe('#save', function () {
        it('calls validate');
        it('rejects with validation errors');
        it('calls object\'s #save if validation passes');
        it('skips validation if it\'s a deletion');
    });
});
