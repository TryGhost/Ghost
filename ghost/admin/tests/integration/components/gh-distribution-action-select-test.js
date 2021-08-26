import hbs from 'htmlbars-inline-precompile';
import mockPosts from '../../../mirage/config/posts';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render, settled} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

describe('Integration: Component: gh-distribution-action-select', function () {
    setupRenderingTest();
    let server;

    beforeEach(function () {
        server = startMirage();
        let author = server.create('user');

        mockPosts(server);

        server.create('post', {authors: [author]});

        this.set('store', this.owner.lookup('service:store'));
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', async function () {
        this.set('post', this.store.findRecord('post', 1));
        await settled();

        await render(hbs`<GhDistributionActionSelect @post=post />`);

        expect(this.element, 'top-level elements').to.exist;
    });
});
