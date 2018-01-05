import Pretender from 'pretender';
import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-download-count', function () {
    setupComponentTest('gh-download-count', {
        integration: true
    });

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

    it('hits count endpoint and renders', function () {
        this.render(hbs`{{gh-download-count}}`);

        return wait().then(() => {
            expect(this.$().text().trim()).to.equal('42');
        });
    });

    it('renders with a block', function () {
        this.render(hbs`
            {{#gh-download-count as |count|}}
                {{count}} downloads
            {{/gh-download-count}}
        `);

        return wait().then(() => {
            expect(this.$().text().trim()).to.equal('42 downloads');
        });
    });
});
