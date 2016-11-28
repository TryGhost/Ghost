/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import run from 'ember-runloop';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';

describe('Integration: Component: gh-search-input', function () {
    setupComponentTest('gh-search-input', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', function () {
        // renders the component on the page
        this.render(hbs`{{gh-search-input}}`);

        expect(this.$('.ember-power-select-search input')).to.have.length(1);
    });

    it('opens the dropdown on text entry', function (done) {
        this.render(hbs`{{gh-search-input}}`);

        // enter text to trigger search
        run(() => {
            this.$('input[type="search"]').val('test').trigger('input');
        });

        wait().then(() => {
            expect(this.$('.ember-basic-dropdown-content').length).to.equal(1);
            done();
        });
    });
});
