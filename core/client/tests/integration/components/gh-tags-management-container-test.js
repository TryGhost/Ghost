/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

const resizeStub = Ember.Service.extend(Ember.Evented, {

});

describeComponent(
    'gh-tags-management-container',
    'Integration: Component: gh-tags-management-container',
    {
        integration: true
    },
    function () {
        beforeEach(function () {
            this.register('service:resize-service', resizeStub);
            this.inject.service('resize-service', {as: 'resize-service'});
        });

        it('renders', function () {
            this.set('mobileWidth', 600);
            this.set('tags', []);
            this.set('selectedTag', null);
            this.on('enteredMobile', function () {
                // noop
            });
            this.on('leftMobile', function () {
                // noop
            });

            this.render(hbs`
                {{#gh-tags-management-container mobileWidth=mobileWidth tags=tags selectedTag=selectedTag enteredMobile="enteredMobile" leftMobile="leftMobile"}}{{/gh-tags-management-container}}
            `);
            expect(this.$()).to.have.length(1);
        });
    }
);
