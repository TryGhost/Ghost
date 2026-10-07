import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: twitter-url-user', function () {
    setupTest();

    it('deserializes twitter url', function () {
        const transform = this.owner.lookup('transform:twitter-url-user');
        const serialized = '@testuser';
        const result = transform.deserialize(serialized);

        expect(result).to.equal('https://twitter.com/testuser');
    });

    it('serializes url to twitter username', function () {
        const transform = this.owner.lookup('transform:twitter-url-user');
        const deserialized = 'https://twitter.com/testuser';
        const result = transform.serialize(deserialized);

        expect(result).to.equal('@testuser');
    });
});
