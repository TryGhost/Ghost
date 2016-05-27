/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';

describeModule(
    'route:subscribers/import',
    'Unit: Route: subscribers/import',
    {
        // Specify the other units that are required for this test.
        needs: ['service:notifications']
    },
    function() {
        it('exists', function() {
            let route = this.subject();
            expect(route).to.be.ok;
        });
    }
);
