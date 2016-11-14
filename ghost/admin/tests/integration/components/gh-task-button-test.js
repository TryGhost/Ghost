/* jshint expr:true */
import {expect} from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'gh-task-button',
    'Integration: Component: gh-task-button',
    {
        integration: true
    },
    function() {
        it('renders', function () {
            this.render(hbs`{{#gh-task-button}}Test{{/gh-task-button}}`);
            expect(this.$()).to.have.length(1);
            expect(this.$().text().trim()).to.equal('Test');
        });

        // TODO: figure out how to test concurrency behavior
    }
);
