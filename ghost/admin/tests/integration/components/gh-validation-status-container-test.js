import DS from 'ember-data';
import EmberObject from '@ember/object';
import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

const {Errors} = DS;

describe('Integration: Component: gh-validation-status-container', function () {
    setupComponentTest('gh-validation-status-container', {
        integration: true
    });

    beforeEach(function () {
        let testObject = EmberObject.create();
        testObject.set('name', 'Test');
        testObject.set('hasValidated', []);
        testObject.set('errors', Errors.create());

        this.set('testObject', testObject);
    });

    it('has no success/error class by default', function () {
        this.render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        return wait().then(() => {
            expect(this.$('.gh-test')).to.have.length(1);
            expect(this.$('.gh-test').hasClass('success')).to.be.false;
            expect(this.$('.gh-test').hasClass('error')).to.be.false;
        });
    });

    it('has success class when valid', function () {
        this.get('testObject.hasValidated').push('name');

        this.render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        return wait().then(() => {
            expect(this.$('.gh-test')).to.have.length(1);
            expect(this.$('.gh-test').hasClass('success')).to.be.true;
            expect(this.$('.gh-test').hasClass('error')).to.be.false;
        });
    });

    it('has error class when invalid', function () {
        this.get('testObject.hasValidated').push('name');
        this.get('testObject.errors').add('name', 'has error');

        this.render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        return wait().then(() => {
            expect(this.$('.gh-test')).to.have.length(1);
            expect(this.$('.gh-test').hasClass('success')).to.be.false;
            expect(this.$('.gh-test').hasClass('error')).to.be.true;
        });
    });

    it('still renders if hasValidated is undefined', function () {
        this.set('testObject.hasValidated', undefined);

        this.render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        return wait().then(() => {
            expect(this.$('.gh-test')).to.have.length(1);
        });
    });
});
