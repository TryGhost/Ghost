/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration: Component: gh-task-button', function() {
    setupComponentTest('gh-task-button', {
        integration: true
    });

    it('renders', function () {
        this.render(hbs`{{#gh-task-button}}Test{{/gh-task-button}}`);
        expect(this.$()).to.have.length(1);
        expect(this.$().text().trim()).to.equal('Test');
    });

    // TODO: figure out how to test concurrency behavior
});
