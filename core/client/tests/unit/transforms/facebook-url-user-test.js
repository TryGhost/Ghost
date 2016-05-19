/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import Ember from 'ember';

const emberA = Ember.A;

describeModule(
    'transform:facebook-url-user',
    'Unit: Transform: facebook-url-user',
    {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    },
    function() {
        it('deserializes facebook url', function () {
            let transform = this.subject();
            let serialized = 'testuser';
            let result = transform.deserialize(serialized);

            expect(result).to.equal('https://www.facebook.com/testuser');
        });

        it('serializes url to facebook username', function () {
            let transform = this.subject();
            let deserialized = 'https://www.facebook.com/testuser';
            let result = transform.serialize(deserialized);

            expect(result).to.equal('testuser');
        });
    }
);
