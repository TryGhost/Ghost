import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-site-iframe', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.owner.register('config:main', {
            blogUrl: 'http://localhost:2368'
        }, {instantiate: false});
    });

    it('forwards the View site preview marker to the iframe element', async function () {
        await render(hbs`<GhSiteIframe data-view-site-preview />`);

        const iframe = find('iframe');
        expect(iframe).to.have.attribute('data-view-site-preview');
        expect(iframe).to.have.class('site-frame');
    });
});
