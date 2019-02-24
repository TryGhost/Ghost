import {helper} from '@ember/component/helper';

export function kgStyle([style], options) {
    let cssClass = '';

    let pFontStyle = 'f3 fw3 lh-copy tracked-1 serif';
    let cardBorderStyle = 'pt2 pb2 pl3 nl3 pr3 nr3 ba b--white relative kg-card-left-border kg-card-hover';

    switch (style) {
    // Card menu
    case 'cardmenu':
        cssClass = 'koenig-cardmenu absolute top-0 flex flex-wrap justify-start mt0 mr0 mb5 ml0 pa4 overflow-y-auto bg-white br3 shadow-3 ttn f7 normal';
        break;

    case 'cardmenu-card':
        cssClass = 'flex flex-column justify-center items-center w20 h19 br3 midgrey ba b--transparent hover-darkgrey kg-cardmenu-card-hover pt1 anim-fast';
        break;

    case 'cardmenu-icon':
        cssClass = 'flex items-center';
        break;

    case 'cardmenu-label':
        cssClass = 'f-supersmall tracked-1 fw1 ma0 mt1';
        break;

    // Container cards
    case 'container-card':
        cssClass = cardBorderStyle;
        break;

    // Generic media card
    case 'media-card':
        cssClass = `${pFontStyle} ma0 ba b--transparent kg-card-hover`;
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
