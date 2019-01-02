import hbs from 'htmlbars-inline-precompile';
import {clickTrigger} from 'ember-basic-dropdown/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-basic-dropdown', function () {
    setupRenderingTest();

    it('closes when dropdown service fires close event', async function () {
        let dropdownService = this.owner.lookup('service:dropdown');

        await render(hbs`
            {{#gh-basic-dropdown as |dropdown|}}
                <button class="ember-basic-dropdown-trigger" onclick={{dropdown.actions.toggle}}></button>
                {{#if dropdown.isOpen}}
                    <div id="dropdown-is-opened"></div>
                {{/if}}
            {{/gh-basic-dropdown}}
        `);

        await clickTrigger();
        expect(find('#dropdown-is-opened')).to.exist;

        dropdownService.closeDropdowns();
        await settled();

        expect(find('#dropdown-is-opened')).to.not.exist;
    });
});
