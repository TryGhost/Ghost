import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

describe('Integration: Component: gh-publishmenu', function() {
    setupComponentTest('gh-publishmenu', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = startMirage();
        server.loadFixtures();

        server.create('user');
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', function () {
        this.post = server.create('post');
        this.render(hbs`{{gh-publishmenu post=post}}`);
        expect(this.$()).to.have.length(1);
    });
});
