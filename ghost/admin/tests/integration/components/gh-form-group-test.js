import DS from 'ember-data'; // eslint-disable-line
import EmberObject from '@ember/object';
import hbs from 'htmlbars-inline-precompile';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

const {Errors} = DS;

describe('Integration: Component: gh-form-group', function () {
    setupRenderingTest();

    beforeEach(function () {
        let testObject = EmberObject.create();
        testObject.name = 'Test';
        testObject.hasValidated = [];
        testObject.errors = Errors.create();

        this.set('testObject', testObject);
    });

    // NOTE: primarily testing the validation-status modifier

    it('has no success/error class by default', async function () {
        await render(hbs`
            <GhFormGroup
                @property="test"
                @errors={{this.testObject.errors}}
                @hasValidated={{this.testObject.hasValidated}}
            >Testing</GhFormGroup>
        `);

        expect(find('.form-group')).to.exist;
        expect(find('.form-group')).to.not.have.class('success');
        expect(find('.form-group')).to.not.have.class('error');
    });

    it('has success class when valid', async function () {
        await render(hbs`
            <GhFormGroup
                @property="name"
                @errors={{this.testObject.errors}}
                @hasValidated={{this.testObject.hasValidated}}
            >Testing</GhFormGroup>
        `);

        this.testObject.hasValidated.pushObject('name'); // pushObject vs push because this is an EmberArray and we're testing tracking
        await settled();

        expect(find('.form-group')).to.have.class('success');
        expect(find('.form-group')).to.not.have.class('error');
    });

    it('has error class when invalid', async function () {
        await render(hbs`
            <GhFormGroup
                @property="name"
                @errors={{this.testObject.errors}}
                @hasValidated={{this.testObject.hasValidated}}
            >Testing</GhFormGroup>
        `);

        this.testObject.hasValidated.pushObject('name'); // pushObject vs push because this is an EmberArray and we're testing tracking
        this.testObject.errors.add('name', 'has error');
        await settled();

        expect(find('.form-group')).to.have.class('error');
        expect(find('.form-group')).to.not.have.class('success');
    });

    it('still renders if hasValidated is undefined', async function () {
        delete this.testObject.hasValidated;

        await render(hbs`
            <GhFormGroup
                @property="name"
                @errors={{this.testObject.errors}}
                @hasValidated={{this.testObject.hasValidated}}
            >Testing</GhFormGroup>
        `);

        expect(find('.form-group')).to.exist;
    });

    it('passes element attributes through', async function () {
        await render(hbs`
            <GhFormGroup
                class="custom"
                @property="name"
                @errors={{this.testObject.errors}}
                @hasValidated={{this.testObject.hasValidated}}
                data-test-exists="true"
            >Testing</GhFormGroup>
        `);

        expect(find('.form-group')).to.have.class('custom');
        expect(find('[data-test-exists="true"]')).to.exist;
    });
});
