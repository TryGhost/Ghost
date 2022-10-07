import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: twitter-url-user', function () {
    setupTest();

    it('deserializes twitter url', function () {
        let transform = this.owner.lookup('transform:twitter-url-user');
        let serialized = '@testuser';
        let result = transform.deserialize(serialized);

        expect(result).to.equal('https://twitter.com/testuser');
    });

    it('serializes url to twitter username', function () {
        let transform = this.owner.lookup('transform:twitter-url-user');
        let deserialized = 'https://twitter.com/testuser';
        let result = transform.serialize(deserialized);

        expect(result).to.equal('@testuser');
    });
});
