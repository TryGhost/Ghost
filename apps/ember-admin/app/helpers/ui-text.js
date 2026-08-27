import {helper} from '@ember/component/helper';

export function uiText([style]) {
    let cssClass = '';

    switch (style) {
    case 'h1':
        cssClass = 'f-subheadline fw7 tracked-3 lh-heading ma0 pa0';
        break;
    case 'h2':
        cssClass = 'f2 fw6 tracked-2 tracked-3 lh-title ma0 pa0';
        break;
    case 'h3':
        cssClass = 'f5 fw6 tracked-2 lh-title ma0 pa0';
        break;
    case 'h4':
        cssClass = 'f7 fw6 tracked-2 lh-copy ma0 pa0';
        break;
    case 'h5':
        cssClass = 'f8 fw6 tracked-2 lh-copy ma0 pa0';
        break;
    case 'h6':
        cssClass = 'f-small ttu fw4 tracked-3 lh-copy ma0 pa0';
        break;
    case 'tl':
        cssClass = 'f6 fw3 lh-copy tracked-1 ma0 pa0';
        break;
    case 't':
        cssClass = 'f7 fw3 lh-copy tracked-1 ma0 pa0';
        break;
    case 'ts':
        cssClass = 'f8 fw3 lh-copy tracked-2 ma0 pa0';
        break;
    case 'txs':
        cssClass = 'f-small fw3 lh-copy tracked-3 ma0 pa0';
        break;
    }

    return cssClass;
}

export default helper(uiText);
