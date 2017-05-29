/* jshint expr:true */
import run from 'ember-runloop';
import {describe, it} from 'mocha';
import {A as emberA} from 'ember-array/utils';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-selectize', function () {
    setupComponentTest('gh-selectize', {
        // Specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar'],
        unit: true
    });

    it('re-orders selection when selectize order is changed', function () {
        let component = this.subject();

        let item1 = {id: '1', name: 'item 1'};
        let item2 = {id: '2', name: 'item 2'};
        let item3 = {id: '3', name: 'item 3'};

        run(() => {
            component.set('content', emberA([item1, item2, item3]));
            component.set('selection', emberA([item2, item3]));
            component.set('multiple', true);
            component.set('optionValuePath', 'content.id');
            component.set('optionLabelPath', 'content.name');
        });

        this.render();

        run(() => {
            component._selectize.setValue(['3', '2']);
        });

        expect(component.get('selection').toArray(), 'component selection').to.deep.equal([item3, item2]);
    });
});
