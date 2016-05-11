/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';

describeModule(
    'route:subscribers',
    'Unit: Route: subscribers',
    {
        needs: ['service:notifications']
    },
    function() {
        it('exists', function() {
            let route = this.subject();
            expect(route).to.be.ok;
        });
    }
);
