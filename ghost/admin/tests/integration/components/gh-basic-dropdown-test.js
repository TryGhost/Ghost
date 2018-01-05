import $ from 'jquery';
import hbs from 'htmlbars-inline-precompile';
import {clickTrigger} from '../../helpers/ember-basic-dropdown';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find} from 'ember-native-dom-helpers';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-basic-dropdown', function () {
    setupComponentTest('gh-basic-dropdown', {
        integration: true
    });

    it('closes when dropdown service fires close event', function () {
        let dropdownService = this.container.lookup('service:dropdown');

        this.render(hbs`
            {{#gh-basic-dropdown as |dropdown|}}
                <button class="ember-basic-dropdown-trigger" onclick={{dropdown.actions.toggle}}></button>
                {{#if dropdown.isOpen}}
                    <div id="dropdown-is-opened"></div>
                {{/if}}
            {{/gh-basic-dropdown}}
        `);

        clickTrigger();
        expect($(find('#dropdown-is-opened'))).to.exist;

        run(() => {
            dropdownService.closeDropdowns();
        });

        expect($(find('#dropdown-is-opened'))).to.not.exist;
    });
});
