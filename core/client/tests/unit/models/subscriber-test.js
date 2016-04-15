/* jshint expr:true */
import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';

describeModel(
    'subscriber',
    'Unit: Model: subscriber',
    {
        // Specify the other units that are required for this test.
        needs: ['model:post']
    },
    function() {
        // Replace this with your real tests.
        it('exists', function() {
            let model = this.subject();
            // var store = this.store();
            expect(model).to.be.ok;
        });
    }
);
