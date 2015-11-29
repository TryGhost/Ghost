/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';
import DS from 'ember-data';

describeComponent(
    'gh-validation-status-container',
    'Integration: Component: gh-validation-status-container',
    {
        integration: true
    },
    function () {
        beforeEach(function () {
            let testObject = new Ember.Object();
            testObject.set('name', 'Test');
            testObject.set('hasValidated', []);
            testObject.set('errors', DS.Errors.create());

            this.set('testObject', testObject);
        });

        it('has no success/error class by default', function () {
            this.render(hbs`
                {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                {{/gh-validation-status-container}}
            `);
            expect(this.$('.gh-test')).to.have.length(1);
            expect(this.$('.gh-test').hasClass('success')).to.be.false;
            expect(this.$('.gh-test').hasClass('error')).to.be.false;
        });

        it('has success class when valid', function () {
            this.get('testObject.hasValidated').push('name');

            this.render(hbs`
                {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                {{/gh-validation-status-container}}
            `);
            expect(this.$('.gh-test')).to.have.length(1);
            expect(this.$('.gh-test').hasClass('success')).to.be.true;
            expect(this.$('.gh-test').hasClass('error')).to.be.false;
        });

        it('has error class when invalid', function () {
            this.get('testObject.hasValidated').push('name');
            this.get('testObject.errors').add('name', 'has error');

            this.render(hbs`
                {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                {{/gh-validation-status-container}}
            `);
            expect(this.$('.gh-test')).to.have.length(1);
            expect(this.$('.gh-test').hasClass('success')).to.be.false;
            expect(this.$('.gh-test').hasClass('error')).to.be.true;
        });

        it('still renders if hasValidated is undefined', function () {
            this.set('testObject.hasValidated', undefined);

            this.render(hbs`
                {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                {{/gh-validation-status-container}}
            `);
            expect(this.$('.gh-test')).to.have.length(1);
        });
    }
);
