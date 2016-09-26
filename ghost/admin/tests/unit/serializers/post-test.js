/* jshint expr:true */
import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';

describeModel(
    'post',
    'Unit:Serializer: post',
    {
        // Specify the other units that are required for this test.
        needs: ['transform:moment-utc', 'transform:json-string', 'model:user', 'model:tag']
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
