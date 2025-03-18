// // import {rgbToHex} from '../../lib/utils/rgb-to-hex';
const {utils} = require('../../');
const rgbToHex = utils.rgbToHex;

describe('rgbToHex', function () {
    it('should convert RGB to HEX', function () {
        should(rgbToHex('rgb(0, 0, 0)')).equal('#000000');
        should(rgbToHex('rgb(255, 255, 255)')).equal('#ffffff');
        should(rgbToHex('rgb(255, 0, 0)')).equal('#ff0000');
        should(rgbToHex('rgb(0, 255, 0)')).equal('#00ff00');
        should(rgbToHex('rgb(0, 0, 255)')).equal('#0000ff');
        should(rgbToHex('rgb(255, 255, 0)')).equal('#ffff00');
    });

    it('should handle transparent', function () {
        should(rgbToHex('transparent')).equal('transparent');
    });
});
