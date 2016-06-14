/* jshint expr:true */
import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';

describeModel(
    'subscriber',
    'Unit:Serializer: subscriber',
    {
        // Specify the other units that are required for this test.
        needs: ['model:post', 'transform:moment-utc']
    },

    function() {
        // Replace this with your real tests.
        it('serializes records', function() {
            let record = this.subject();

            let serializedRecord = record.serialize();

            expect(record).to.be.ok;
        });
    }
);
