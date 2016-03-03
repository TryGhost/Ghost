/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import Ember from 'ember';

const emberA = Ember.A;

describeModule(
    'transform:twitter-url-user',
    'Unit: Transform: twitter-url-user',
    {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    },
    function() {
        it('deserializes twitter url', function () {
            let transform = this.subject();
            let serialized = '@testuser';
            let result = transform.deserialize(serialized);

            expect(result).to.equal('https://twitter.com/testuser');
        });

        it('serializes url to twitter username', function () {
            let transform = this.subject();
            let deserialized = 'https://twitter.com/testuser';
            let result = transform.serialize(deserialized);

            expect(result).to.equal('@testuser');
        });
    }
);
