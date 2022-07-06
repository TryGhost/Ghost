import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Helper: clean-basic-html', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('inputValue', '1234');

        await render(hbs`{{clean-basic-html inputValue}}`);

        expect(this.element).to.have.trimmed.text('1234');
    });
});

