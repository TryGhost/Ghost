var should = require('should'),
    // Stuff we are testing
    input_email = require('../../../../server/apps/subscribers/lib/helpers/input_email');

describe('{{input_email}} helper', function () {
    it('has input_email helper', function () {
        should.exist(input_email);
    });

    it('returns the correct input when no custom options are specified', function () {
        var markup = '<input class="subscribe-email" type="email" name="email"  />',
            rendered = input_email();
        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a custom class is specified', function () {
        var markup = '<input class="test-class" type="email" name="email"  />',
            options = {
                hash: {
                    class: 'test-class'
                }
            },
            rendered = input_email(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when an autofocus is specified', function () {
        var markup = '<input class="subscribe-email" type="email" name="email" autofocus="autofocus" />',
            options = {
                hash: {
                    autofocus: true
                }
            },
            rendered = input_email(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a placeholder is specified', function () {
        var markup = '<input class="subscribe-email" type="email" name="email" placeholder="Test" />',
            options = {
                hash: {
                    placeholder: 'Test'
                }
            },
            rendered = input_email(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when a value is specified', function () {
        var markup = '<input class="subscribe-email" type="email" name="email" value="Test value" />',
            options = {
                hash: {
                    value: 'Test value'
                }
            },
            rendered = input_email(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });

    it('returns the correct input when an id is specified', function () {
        var markup = '<input class="subscribe-email" type="email" name="email" id="test-id" />',
            options = {
                hash: {
                    id: 'test-id'
                }
            },
            rendered = input_email(options);

        should.exist(rendered);

        String(rendered).should.equal(markup);
    });
});
