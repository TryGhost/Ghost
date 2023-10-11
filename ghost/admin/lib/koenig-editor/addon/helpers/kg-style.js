import {helper} from '@ember/component/helper';

export function kgStyle([style], options) {
    let cssClass = '';

    switch (style) {
    case 'figcaption':
        cssClass = 'db pa2 center lh-title sans-serif fw4 f7 middarkgrey tracked-2 tc';
        break;
    }

    return cssClass;
}

export default helper(kgStyle);
