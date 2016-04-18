/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';

describeModule(
    'controller:subscribers',
    'Unit: Controller: subscribers',
    {
        needs: ['service:notifications']
    },
    function() {
        // Replace this with your real tests.
        it('exists', function() {
            let controller = this.subject();
            expect(controller).to.be.ok;
        });
    }
);
