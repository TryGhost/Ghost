/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Table from 'ember-light-table';

describe('Integration: Component: gh-subscribers-table', function() {
    setupComponentTest('gh-subscribers-table', {
        integration: true
    });

    it('renders', function() {
        this.set('table', new Table([], []));
        this.set('sortByColumn', function () {});
        this.set('delete', function () {});

        this.render(hbs`{{gh-subscribers-table table=table sortByColumn=(action sortByColumn) delete=(action delete)}}`);
        expect(this.$()).to.have.length(1);
    });
});
