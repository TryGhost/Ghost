const assert = require('node:assert/strict');
const stylex = require('../../../../../../core/server/services/koenig/render-utils/stylex');

describe('stylex', function () {
    it('combines multiple style objects', function () {
        const result = stylex(
            {width: 100, height: 50},
            {backgroundColor: 'red'},
            {display: 'flex'}
        );
        assert.equal(result, 'width: 100px; height: 50px; background-color: red; display: flex;');
    });

    it('handles conditional styles', function () {
        const isActive = true;
        const isHidden = false;

        const result = stylex(
            {color: 'black'},
            isActive && {backgroundColor: 'blue'},
            isHidden && {display: 'none'}
        );
        assert.equal(result, 'color: black; background-color: blue;');
    });

    it('converts camelCase to kebab-case', function () {
        const result = stylex({
            backgroundColor: 'red',
            fontSize: 16,
            marginTop: 10,
            borderBottomWidth: 2
        });
        assert.equal(result, 'background-color: red; font-size: 16px; margin-top: 10px; border-bottom-width: 2px;');
    });

    it('adds px units to numeric values for specific properties', function () {
        const result = stylex({
            width: 100,
            height: 50,
            margin: 20,
            padding: 10,
            fontSize: 16,
            lineHeight: 1.5,
            borderRadius: 5
        });
        assert.equal(result, 'width: 100px; height: 50px; margin: 20px; padding: 10px; font-size: 16px; line-height: 1.5; border-radius: 5px;');
    });

    it('handles null, undefined, and empty values', function () {
        const result = stylex(
            {color: 'black'},
            {backgroundColor: null},
            {display: undefined},
            {margin: ''}
        );
        assert.equal(result, 'color: black;');
    });

    it('handles non-numeric values without adding units', function () {
        const result = stylex({
            width: '100%',
            height: 'auto',
            margin: '1em',
            padding: '2rem',
            fontSize: 'inherit'
        });
        assert.equal(result, 'width: 100%; height: auto; margin: 1em; padding: 2rem; font-size: inherit;');
    });

    it('handles empty input', function () {
        assert.equal(stylex(), '');
        assert.equal(stylex(null), '');
        assert.equal(stylex(undefined), '');
        assert.equal(stylex({}), '');
    });

    it('handles nested style objects', function () {
        const result = stylex(
            {color: 'black'},
            {...{backgroundColor: 'red'}}
        );
        assert.equal(result, 'color: black; background-color: red;');
    });

    it('preserves order of properties', function () {
        const result = stylex(
            {width: 100, height: 50},
            {width: 200} // Should override previous width
        );
        assert.equal(result, 'width: 200px; height: 50px;');
    });

    it('handles plain CSS strings', function () {
        const result = stylex(
            'background-color: blue; color: white',
            {margin: 20}
        );
        assert.equal(result, 'background-color: blue; color: white; margin: 20px;');
    });

    it('handles mixed string and object inputs', function () {
        const result = stylex(
            'padding: 10px; border: 1px solid black',
            {backgroundColor: 'red'},
            'margin: 20px'
        );
        assert.equal(result, 'padding: 10px; border: 1px solid black; background-color: red; margin: 20px;');
    });

    it('handles malformed CSS strings', function () {
        const result = stylex(
            'invalid-css',
            'color: red;',
            ';margin: 10px;',
            {backgroundColor: 'blue'}
        );
        assert.equal(result, 'color: red; margin: 10px; background-color: blue;');
    });

    it('handles whitespace in CSS strings', function () {
        const result = stylex(
            '  color  :  red  ;  margin  :  10px  ',
            {backgroundColor: 'blue'}
        );
        assert.equal(result, 'color: red; margin: 10px; background-color: blue;');
    });

    it('always includes trailing semicolon', function () {
        const result = stylex({color: 'red'});
        assert.equal(result, 'color: red;');
    });

    it('includes space between style name and value', function () {
        const result = stylex({color: 'red'});
        assert.equal(result, 'color: red;');
    });
});
