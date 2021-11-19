import {describe, it} from 'mocha';
import {expect} from 'chai';
import {hbs} from 'ember-cli-htmlbars';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration | Component | koenig-card-audio', function () {
    setupRenderingTest();

    it('renders', async function () {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<KoenigCardAudio />`);

        expect(this.element.textContent.trim()).to.equal('');

        // Template block usage:
        await render(hbs`
      <KoenigCardAudio>
        template block text
      </KoenigCardAudio>
    `);

        expect(this.element.textContent.trim()).to.equal('template block text');
    });
});
