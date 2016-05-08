/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Table from 'ember-light-table';

describeComponent(
    'gh-subscribers-table',
    'Integration: Component: gh-subscribers-table',
    {
        integration: true
    },
    function() {
        it('renders', function() {
            this.set('table', new Table([], []));
            this.set('sortByColumn', function () {});
            this.set('delete', function () {});

            this.render(hbs`{{gh-subscribers-table table=table sortByColumn=(action sortByColumn) delete=(action delete)}}`);
            expect(this.$()).to.have.length(1);
        });
    }
);
