const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');

const contrast_text_color = require('../../../../core/frontend/helpers/contrast_text_color');

describe('{{contrast_text_color}} helper', function () {
    it('has contrast_text_color helper', function () {
        assertExists(contrast_text_color);
    });

    it('returns white for dark backgrounds', function () {
        assert.equal(contrast_text_color('#15171A'), '#FFFFFF');
    });

    it('returns black for light backgrounds', function () {
        assert.equal(contrast_text_color('#FFFFFF'), '#000000');
    });

    it('falls back to white for invalid colors', function () {
        assert.equal(contrast_text_color(''), '#FFFFFF');
    });
});
