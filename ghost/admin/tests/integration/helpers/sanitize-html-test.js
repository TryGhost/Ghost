import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Helper: sanitize-html', function () {
    setupComponentTest('sanitize-html', {
        integration: true
    });

    it('renders html', function () {
        this.set('inputValue', '<strong>bold</strong>');

        this.render(hbs`{{sanitize-html inputValue}}`);

        expect(this.$().html().trim()).to.equal('<strong>bold</strong>');
    });

    it('replaces scripts', function () {
        this.set('inputValue', '<script></script>');

        this.render(hbs`{{sanitize-html inputValue}}`);

        expect(this.$().html().trim()).to.equal('<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });
});

