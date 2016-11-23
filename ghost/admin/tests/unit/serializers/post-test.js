/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupModelTest} from 'ember-mocha';

describe('Unit:Serializer: post', function() {
    setupModelTest('post', {
        // Specify the other units that are required for this test.
        needs: ['transform:moment-utc', 'transform:json-string', 'model:user', 'model:tag']
    });

    // Replace this with your real tests.
    it('serializes records', function() {
        let record = this.subject();

        let serializedRecord = record.serialize();

        expect(serializedRecord).to.be.ok;
    });
});
