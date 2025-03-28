import {Color} from '@tryghost/color-utils';
import {helper} from '@ember/component/helper';

export default helper(function hexAdjuster([hex], {s: sDiff = 0, l: lDiff = 0} = {}) {
    const originalColor = Color(hex);

    let newColor = originalColor;

    if (sDiff !== 0) {
        newColor = newColor.saturationl(newColor.saturationl() + sDiff);
    }

    if (lDiff !== 0) {
        newColor = newColor.lightness(newColor.lightness() + lDiff);
    }

    return newColor.hex();
});
