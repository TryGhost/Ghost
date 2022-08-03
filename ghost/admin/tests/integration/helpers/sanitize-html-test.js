import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Helper: sanitize-html', function () {
    setupRenderingTest();

    it('renders html', async function () {
        this.set('inputValue', '<strong>bold</strong>');

        await render(hbs`{{{sanitize-html inputValue}}}`);

        expect(this.element).to.have.trimmed.html('<strong>bold</strong>');
    });

    it('replaces scripts', async function () {
        this.set('inputValue', '<script></script>');

        await render(hbs`{{{sanitize-html inputValue}}}`);

        expect(this.element).to.have.trimmed.html('<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });
});

