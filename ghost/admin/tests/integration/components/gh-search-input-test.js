import Pretender from 'pretender';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {fillIn, find, findAll, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-search-input', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', async function () {
        // renders the component on the page
        await render(hbs`<GhSearchInput />`);

        expect(find('.ember-power-select-search input')).to.exist;
    });

    it('opens the dropdown on text entry', async function () {
        await render(hbs`<GhSearchInput />`);
        await fillIn('input[type="search"]', 'test');

        expect(findAll('.ember-basic-dropdown-content').length).to.equal(1);
    });
});
