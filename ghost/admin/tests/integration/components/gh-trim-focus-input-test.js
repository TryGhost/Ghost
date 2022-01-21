import hbs from 'htmlbars-inline-precompile';
import {blur, find, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-trim-focus-input', function () {
    setupRenderingTest();

    it('trims value on focusOut', async function () {
        this.set('text', 'some random stuff    ');
        await render(hbs`{{gh-trim-focus-input value=(readonly text) input=(action (mut text) value="target.value")}}`);

        await blur('input');

        expect(this.text).to.equal('some random stuff');
    });

    it('trims value on focusOut before calling custom focus-out', async function () {
        this.set('text', 'some random stuff    ');
        this.set('customFocusOut', function (value) {
            expect(find('.gh-input').value, 'input value').to.equal('some random stuff');
            expect(value, 'value').to.equal('some random stuff');
        });

        await render(hbs`{{gh-trim-focus-input
            value=(readonly text)
            input=(action (mut text) value="target.value")
            focus-out=(action customFocusOut)
        }}`);

        await blur('input');

        expect(this.text).to.equal('some random stuff');
    });

    it('does not have the autofocus attribute if not set to focus', async function () {
        this.set('text', 'some text');
        await render(hbs`{{gh-trim-focus-input value=(readonly text) shouldFocus=false}}`);
        expect(find('input').autofocus).to.not.be.ok;
    });

    it('has the autofocus attribute if set to focus', async function () {
        this.set('text', 'some text');
        await render(hbs`{{gh-trim-focus-input value=(readonly text) shouldFocus=true}}`);
        expect(find('input').autofocus).to.be.ok;
    });

    it('handles undefined values', async function () {
        this.set('text', undefined);
        await render(hbs`{{gh-trim-focus-input value=(readonly text) shouldFocus=true}}`);
        expect(find('input').autofocus).to.be.ok;
    });

    it('handles non-string values', async function () {
        this.set('text', 10);
        await render(hbs`{{gh-trim-focus-input value=(readonly text) shouldFocus=true}}`);
        expect(find('input').value).to.equal('10');
    });
});
