import DS from 'ember-data'; // eslint-disable-line
import EmberObject from '@ember/object';
import hbs from 'htmlbars-inline-precompile';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

const {Errors} = DS;

describe('Integration: Modifier: validation-status', function () {
    setupRenderingTest();

    this.beforeEach(function () {
        let testObject = EmberObject.create();
        testObject.name = 'Test';
        testObject.hasValidated = [];
        testObject.errors = Errors.create();

        this.set('testObject', testObject);
    });

    it('handles missing params', async function () {
        await render(hbs`<div class="test" {{validation-status}}></div>`);
        expect(find('.test')).to.exist;
    });

    describe('with errors/property/hasValidated params', function () {
        it('has no success/error class by default', async function () {
            await render(hbs`
                <div
                    class="test"
                    {{validation-status
                        property="name"
                        errors=this.testObject.errors
                        hasValidated=this.testObject.hasValidated
                    }}
                ></div>
            `);

            expect(find('.test').classList).to.have.length(1);
        });

        it('has success class when valid', async function () {
            await render(hbs`
                <div
                    class="test"
                    {{validation-status
                        property="name"
                        errors=this.testObject.errors
                        hasValidated=this.testObject.hasValidated
                    }}
                ></div>
            `);

            this.testObject.hasValidated.pushObject('name'); // pushObject vs push because this is an EmberArray and we're testing tracking
            await settled();

            expect(find('.test')).to.have.class('success');
            expect(find('.test')).to.not.have.class('error');
        });

        it('has error class when invalid', async function () {
            await render(hbs`
                <div
                    class="test"
                    {{validation-status
                        property="name"
                        errors=this.testObject.errors
                        hasValidated=this.testObject.hasValidated
                    }}
                ></div>
            `);

            this.testObject.hasValidated.pushObject('name'); // pushObject vs push because this is an EmberArray and we're testing tracking
            this.testObject.errors.add('name', 'has error');
            await settled();

            expect(find('.test')).to.have.class('error');
            expect(find('.test')).to.not.have.class('success');
        });

        it('always has error class when no property is passed', async function () {
            await render(hbs`
                <div
                    class="test"
                    {{validation-status
                        errors=this.testObject.errors
                        hasValidated=this.testObject.hasValidated
                    }}
                ></div>
            `);

            this.testObject.hasValidated.pushObject('different'); // pushObject vs push because this is an EmberArray and we're testing tracking
            this.testObject.errors.add('different', 'has error');
            await settled();

            expect(find('.test')).to.have.class('error');
            expect(find('.test')).to.not.have.class('success');
        });

        it('can have custom success/error classes', async function () {
            await render(hbs`
                <div
                    class="test"
                    {{validation-status
                        property="name"
                        errors=this.testObject.errors
                        hasValidated=this.testObject.hasValidated
                        errorClass="custom-error"
                        successClass="custom-success"
                    }}
                ></div>
            `);

            this.testObject.hasValidated.pushObject('name'); // pushObject vs push because this is an EmberArray and we're testing tracking
            await settled();

            expect(find('.test')).to.have.class('custom-success');
            expect(find('.test')).to.not.have.class('success');

            this.testObject.errors.add('name', 'invalid');
            await settled();

            expect(find('.test')).to.have.class('custom-error');
            expect(find('.test')).to.not.have.class('error');
        });
    });
});
