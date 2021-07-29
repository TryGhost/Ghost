import {Color, textColorForBackgroundColor} from '@tryghost/color-utils';
import {helper} from '@ember/component/helper';

export default helper(function hexContrast([hex]) {
    return textColorForBackgroundColor(Color(hex)).hex();
});
