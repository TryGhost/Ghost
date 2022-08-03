// TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
// eslint-disable-next-line
import DS from 'ember-data';
import EmberObject from '@ember/object';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

const {Errors} = DS;

describe('Integration: Component: gh-validation-status-container', function () {
    setupRenderingTest();

    beforeEach(function () {
        let testObject = EmberObject.create();
        testObject.set('name', 'Test');
        testObject.set('hasValidated', []);
        testObject.set('errors', Errors.create());

        this.set('testObject', testObject);
    });

    it('has no success/error class by default', async function () {
        await render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        expect(find('.gh-test')).to.exist;
        expect(find('.gh-test')).to.not.have.class('success');
        expect(find('.gh-test')).to.not.have.class('error');
    });

    it('has success class when valid', async function () {
        this.get('testObject.hasValidated').push('name');

        await render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        expect(find('.gh-test')).to.exist;
        expect(find('.gh-test')).to.have.class('success');
        expect(find('.gh-test')).to.not.have.class('error');
    });

    it('has error class when invalid', async function () {
        this.get('testObject.hasValidated').push('name');
        this.get('testObject.errors').add('name', 'has error');

        await render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        expect(find('.gh-test')).to.exist;
        expect(find('.gh-test')).to.not.have.class('success');
        expect(find('.gh-test')).to.have.class('error');
    });

    it('still renders if hasValidated is undefined', async function () {
        this.set('testObject.hasValidated', undefined);

        await render(hbs`
            {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
            {{/gh-validation-status-container}}
        `);

        expect(find('.gh-test')).to.exist;
    });
});
