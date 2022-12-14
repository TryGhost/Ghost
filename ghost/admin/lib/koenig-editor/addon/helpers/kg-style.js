import {helper} from '@ember/component/helper';

export function kgStyle([style], options) {
    let cssClass = '';

    let pFontStyle = 'f3 fw3 lh-copy tracked-1 serif';
    let cardBorderStyle = 'pl3 nl3 pr3 nr3 ba b--transparent relative kg-card-hover';

    switch (style) {
    // Card menu
    case 'cardmenu':
        cssClass = 'koenig-cardmenu absolute top-0 flex flex-column mt0 mr0 mb3 ml0 overflow-y-auto bg-white br3 shadow-3 ttn f7 normal';
        break;

    case 'cardmenu-card':
        cssClass = 'flex flex-shrink-0 items-center middarkgrey ba b--transparent hover-darkgrey kg-cardmenu-card-hover pl4 pr4 pt2 pb2 anim-fast';
        break;

    case 'cardmenu-icon':
        cssClass = 'flex items-center';
        break;

    case 'cardmenu-text':
        cssClass = 'flex flex-column';
        break;

    case 'cardmenu-label':
        cssClass = 'f8 lh-heading darkgrey tracked-1 fw4 ma0 ml4 flex-grow-1 truncate';
        break;

    case 'cardmenu-desc':
        cssClass = 'f-small lh-heading tracked-1 fw4 ma0 ml4 flex-grow-1 midlightgrey truncate';
        break;

    // Container cards
    case 'container-card':
        cssClass = cardBorderStyle;
        break;

    // Generic media card
    case 'media-card':
        cssClass = `${pFontStyle} ma0 ba b--transparent kg-card-hover`;
        break;
    case 'media-card-placeholder':
        cssClass = `${pFontStyle} ma0 ba b--transparent`;
        break;

    // Media styles & figure caption
    case 'image-normal':
        cssClass = 'center db';
        break;
    case 'image-wide':
        cssClass = 'center mw-100 db';
        break;
    case 'image-full':
        cssClass = 'center mw-100vw db';
        if (options.sidebar) {
            cssClass = `${cssClass} kg-image-full--sidebar`;
        }
        break;
    case 'figcaption':
        cssClass = 'db pa2 center lh-title sans-serif fw4 f7 middarkgrey tracked-2 tc';
        break;

    // Media breakout styles
    case 'breakout':
        if (options.size === 'wide') {
            cssClass = `${cssClass} koenig-breakout-wide`;
        }
        if (options.size === 'full') {
            cssClass = `${cssClass} koenig-breakout-full`;
        }
        break;
    }

    return cssClass;
}

export default helper(kgStyle);
