import assert from 'assert';
import {URI} from './uri.object';

describe('URI', function () {
    it('Can construct a URI from a string', function () {
        const uri = new URI('https://example.com');
        assert.ok(uri);
        assert.strictEqual(uri.href, 'https://example.com/');
    });

    describe('#getValue', function () {
        it('Returns the value of the URL', function () {
            const uri = new URI('https://example.com/activity/inbox/98475923745902348579/');
            const url = new URL('https://activitypub.test/');
            assert.strictEqual(uri.getValue(url), 'https://activitypub.test/activity/inbox/98475923745902348579/');
        });

        it('Returns the value of the URL with a trailing slash', function () {
            const uri = new URI('https://example.com');
            const url = new URL('https://example.com');
            assert.strictEqual(uri.getValue(url), 'https://example.com/');
        });
    });
});
