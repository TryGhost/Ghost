const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');

// Stuff we are testing
const title = require('../../../../core/frontend/helpers/title');

describe('{{title}} Helper', function () {
    it('can render title', function () {
        const rendered = title.call({title: 'Hello World'});

        assertExists(rendered);
        assert.equal(rendered.string, 'Hello World');
    });

    it('escapes correctly', function () {
        const rendered = title.call({title: '<h1>I am a title</h1>'});

        assert.equal(rendered.string, '&lt;h1&gt;I am a title&lt;/h1&gt;');
    });

    it('returns a blank string where title is missing', function () {
        const rendered = title.call({title: null});

        assert.equal(rendered.string, '');
    });

    it('returns a blank string where data missing', function () {
        const rendered = title.call({});

        assert.equal(rendered.string, '');
    });
});
