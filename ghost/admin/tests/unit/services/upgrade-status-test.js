/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';

describeModule(
    'service:upgrade-status',
    'UpgradeStatusService',
    {
        // Specify the other units that are required for this test.
        // needs: ['service:foo']
        needs: []
    },
    function() {
        // Replace this with your real tests.
        it('exists', function() {
            let service = this.subject();
            expect(service).to.be.ok;
        });
    }
);
