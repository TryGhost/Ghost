import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: twitter-url-user', function () {
    setupTest('transform:twitter-url-user', {});
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
});
