import Table from 'ember-light-table';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-subscribers-table', function () {
    setupComponentTest('gh-subscribers-table', {
        integration: true
    });

    it('renders', function () {
        this.set('table', new Table([], []));
        this.set('sortByColumn', function () {});
        this.set('delete', function () {});

        this.render(hbs`{{gh-subscribers-table table=table sortByColumn=(action sortByColumn) delete=(action delete)}}`);
        expect(this.$()).to.have.length(1);
    });
});
