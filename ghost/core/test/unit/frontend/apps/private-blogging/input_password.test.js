// We use the name input_password to match the helper for consistency:
const should = require('should');

// Stuff we are testing
const input_password = require('../../../../../core/frontend/apps/private-blogging/lib/helpers/input_password');

describe('{{input_password}} helper', function () {
    it('has input_password helper', function () {
        should.exist(input_password);
    });

    it('returns the correct input when no custom options are specified', function () {
        const markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" />';
        const rendered = input_password();
        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a custom class is specified', function () {
        const markup = '<input class="test-class" type="password" name="password" autofocus="autofocus" />';

        const options = {
            hash: {
                class: 'test-class'
            }
        };

        const rendered = input_password(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a custom placeholder is specified', function () {
        const markup = '<input class="private-login-password" type="password" name="password" autofocus="autofocus" placeholder="Test" />';

        const options = {
            hash: {
                placeholder: 'Test'
            }
        };

        const rendered = input_password(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });
});
