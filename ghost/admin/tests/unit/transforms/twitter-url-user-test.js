/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import {A as emberA} from 'ember-array/utils';

describeModule(
    'transform:twitter-url-user',
    'Unit: Transform: twitter-url-user',
    {},
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
