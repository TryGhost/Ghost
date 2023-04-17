import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {hbs} from 'ember-cli-htmlbars';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration | Component | modal-post-history', function () {
    setupRenderingTest();

    it('renders', async function () {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<ModalPostHistory />`);

        expect(find('h2').textContent.trim()).to.equal('Post History');

        // Template block usage:
        await render(hbs`
      <ModalPostHistory>
        template block text
      </ModalPostHistory>
    `);

        expect(find('h2').textContent.trim()).to.equal('Post History');
    });
});
