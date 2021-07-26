import {helper} from '@ember/component/helper';
import {hexToRgb, hslToRgb, rgbToHex, rgbToHsl} from '../utils/color';

export default helper(function hexAdjuster([hex], {s: sDiff, l: lDiff} = {}) {
    const rgb = hexToRgb(hex);
    const {h,s,l} = rgbToHsl(rgb);

    const adjS = sDiff ? Math.min(Math.max(s + (sDiff / 100), 0), 1) : s;
    const adjL = lDiff ? Math.min(Math.max(l + (lDiff / 100), 0), 1) : l;

    const adjRgb = hslToRgb({h, s: adjS, l: adjL});
    const adjHex = rgbToHex(adjRgb);

    return adjHex;
});
