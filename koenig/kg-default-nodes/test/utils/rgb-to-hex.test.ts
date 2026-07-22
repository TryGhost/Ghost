import {rgbToHex} from '../../src/utils/rgb-to-hex.js';

describe('rgbToHex', function () {
    it('should convert RGB to HEX', function () {
        expect(rgbToHex('rgb(0, 0, 0)')).toBe('#000000');
        expect(rgbToHex('rgb(255, 255, 255)')).toBe('#ffffff');
        expect(rgbToHex('rgb(255, 0, 0)')).toBe('#ff0000');
        expect(rgbToHex('rgb(0, 255, 0)')).toBe('#00ff00');
        expect(rgbToHex('rgb(0, 0, 255)')).toBe('#0000ff');
        expect(rgbToHex('rgb(255, 255, 0)')).toBe('#ffff00');
    });

    it('should handle transparent', function () {
        expect(rgbToHex('transparent')).toBe('transparent');
    });
});
