import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe.skip('Integration: Component: gh-whats-new', function () {
    setupRenderingTest();

    it('renders', async function () {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<GhWhatsNew />`);

        expect(this.element.textContent.trim()).to.equal('');

        // Template block usage:
        await render(hbs`
      <GhWhatsNew>
        template block text
      </GhWhatsNew>
    `);

        expect(this.element.textContent.trim()).to.equal('template block text');
    });
});
