import assert from 'node:assert/strict';
import {assertExists} from '../../../utils/assertions';
// @ts-expect-error contrast_text_color currently lacks type definitions.
import contrastTextColor from '../../../../core/frontend/helpers/contrast_text_color';

describe('{{contrast_text_color}} helper', function () {
    it('has contrast_text_color helper', function () {
        assertExists(contrastTextColor);
    });

    it('returns white for dark backgrounds', function () {
        assert.equal(contrastTextColor('#15171A'), '#FFFFFF');
    });

    it('returns black for light backgrounds', function () {
        assert.equal(contrastTextColor('#FFFFFF'), '#000000');
    });

    it('returns black for other light backgrounds', function () {
        ['#dacafe', '#ffa5b1', '#a3e6ff'].forEach(color => {
            assert.equal(contrastTextColor(color), '#000000');
        });
    });

    it('returns white for mid-tone backgrounds', function () {
        assert.equal(contrastTextColor('#808080'), '#FFFFFF');
    });

    it('falls back to white for invalid colors', function () {
        assert.equal(contrastTextColor(''), '#FFFFFF');
    });
});
