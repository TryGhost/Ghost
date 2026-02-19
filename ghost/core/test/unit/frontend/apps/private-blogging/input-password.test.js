const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
// We use the name input_password to match the helper for consistency:

// Stuff we are testing
const input_password = require('../../../../../core/frontend/apps/private-blogging/lib/helpers/input_password');

describe('{{input_password}} helper', function () {
    it('has input_password helper', function () {
        assertExists(input_password);
    });

    it('returns the correct input when no custom options are specified', function () {
        const markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" />';
        const rendered = input_password();
        assertExists(rendered);

        assert.equal(String(rendered), markup);
    });

    it('returns the correct input when a custom class is specified', function () {
        const markup = '<input class="test-class" type="password" name="password" autofocus="autofocus" />';

        const options = {
            hash: {
                class: 'test-class'
            }
        };

        const rendered = input_password(options);

        assertExists(rendered);

        assert.equal(String(rendered), markup);
    });

    it('returns the correct input when a custom placeholder is specified', function () {
        const markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" placeholder="Test" />';

        const options = {
            hash: {
                placeholder: 'Test'
            }
        };

        const rendered = input_password(options);

        assertExists(rendered);

        assert.equal(String(rendered), markup);
    });
});
