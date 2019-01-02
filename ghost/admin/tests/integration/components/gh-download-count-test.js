import Pretender from 'pretender';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-download-count', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        server.get('https://count.ghost.org/', function () {
            return [200, {}, JSON.stringify({count: 42})];
        });
    });

    afterEach(function () {
        server.shutdown();
    });

    it('hits count endpoint and renders', async function () {
        await render(hbs`{{gh-download-count}}`);

        expect(this.element).to.have.trimmed.text('42');
    });

    it('renders with a block', async function () {
        await render(hbs`
            {{#gh-download-count as |count|}}
                {{count}} downloads
            {{/gh-download-count}}
        `);

        expect(this.element).to.have.trimmed.text('42 downloads');
    });
});
